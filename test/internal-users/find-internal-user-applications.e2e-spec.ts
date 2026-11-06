import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import {
	createInternalUser,
	createApplication,
	createRole,
	grantInternalUserApplication,
	grantInternalUserRole,
	SeededIam,
	seedIamAdmin,
} from '../helpers/seed';
import { AppTestApp, createAppTestApp } from '../helpers/app-test-app';
import {
	adminAuthorization,
	authorizationHeaderFor,
	authorizationHeaderForClaims,
	authorizationSignedByAnotherKey,
	expiredAuthorization,
} from '../helpers/test-auth';
import { bodyOf, dataOf, ErrorBody } from '../helpers/response-types';
import { ApplicationEntity } from '../../src/common/database/application/application.entity';
import { RoleEntity } from '../../src/common/database/role/role.entity';
import { InternalUserAppEntity } from '../../src/common/database/internal-user/internal-user-app.entity';

const userOf = (response: { body: unknown }) =>
	dataOf<{ id: number; applications: InternalUserAppEntity[] }>(response);

const SECRET_PATTERN = /password|\$2[aby]\$|clienteSecret|cliente_secret/;

describe('GET /internal-users/:id/applications (e2e)', () => {
	let testApp: AppTestApp;
	let iam: SeededIam;

	beforeAll(async () => {
		testApp = await createAppTestApp();
	});

	beforeEach(async () => {
		await testApp.resetTables();
		iam = await seedIamAdmin(testApp.dataSource);
		userId = (
			await createInternalUser(testApp.dataSource, {
				email: 'user@example.com',
			})
		).id;
	});

	afterAll(async () => {
		await testApp.close();
	});

	let userId: number;

	function send(authorization: string | null = adminAuthorization(), id: string | number = userId) {
		const req = testApp.http().get(`/internal-users/${id}/applications`);
		if (authorization) {
			req.set('Authorization', authorization);
		}
		return req;
	}

	it('returns 200 with the user and an empty applications list when it has no assignments', async () => {
		const response = await send().expect(200);

		const body = response.body as { ok: boolean; msg: string };
		expect(body.ok).toBe(true);
		expect(body.msg).toBe('Assigned applications retrieved successfully');
		expect(userOf(response).id).toBe(userId);
		expect(userOf(response).applications).toEqual([]);
		expect(response.text).not.toMatch(SECRET_PATTERN);
	});

	it('returns the assignment row with its application and an empty role list', async () => {
		await grantInternalUserApplication(testApp.dataSource, userId, iam.iamApplication.id);

		const response = await send().expect(200);

		const body = response.body as { ok: boolean; msg: string };
		expect(body.ok).toBe(true);
		expect(body.msg).toBe('Assigned applications retrieved successfully');
		expect(userOf(response).id).toBe(userId);
		const rows = userOf(response).applications;
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({
			internalUserId: userId,
			applicationId: iam.iamApplication.id,
			application: {
				id: iam.iamApplication.id,
				name: 'iam',
				description: 'Identity and access management',
			},
			roles: [],
		});
		expect(rows[0]).not.toHaveProperty('internalUser');
		expect(response.text).not.toMatch(SECRET_PATTERN);
	});

	it('returns the roles assigned to the user nested as roles[].role inside their application row', async () => {
		await grantInternalUserApplication(testApp.dataSource, userId, iam.iamApplication.id);
		await grantInternalUserRole(testApp.dataSource, userId, iam.adminRole);

		const response = await send().expect(200);

		const [row] = userOf(response).applications;
		expect(row.application).toMatchObject({ id: iam.iamApplication.id, name: 'iam' });
		expect(row.roles).toHaveLength(1);
		expect(row.roles[0]).toMatchObject({
			roleId: iam.adminRole.id,
			role: { id: iam.adminRole.id, name: 'ADMIN', description: 'Administrator' },
		});
	});

	it('orders applications newest first, and the roles of each one newest first', async () => {
		const billing = await createApplication(testApp.dataSource, 'billing', 'Billing');
		const payer = await createRole(testApp.dataSource, billing.id, 'PAYER');
		const refunder = await createRole(testApp.dataSource, billing.id, 'REFUNDER');
		await grantInternalUserRole(testApp.dataSource, userId, iam.adminRole);
		await grantInternalUserRole(testApp.dataSource, userId, payer);
		await grantInternalUserRole(testApp.dataSource, userId, refunder);
		await testApp.dataSource
			.getRepository(ApplicationEntity)
			.update(iam.iamApplication.id, { createdAt: new Date(Date.UTC(2024, 0, 1)) });
		await testApp.dataSource
			.getRepository(ApplicationEntity)
			.update(billing.id, { createdAt: new Date(Date.UTC(2024, 0, 2)) });
		const roles = testApp.dataSource.getRepository(RoleEntity);
		await roles.update(payer.id, { createdAt: new Date(Date.UTC(2024, 0, 3)) });
		await roles.update(refunder.id, { createdAt: new Date(Date.UTC(2024, 0, 4)) });

		const response = await send().expect(200);

		const rows = userOf(response).applications;
		expect(rows.map((row) => row.application.name)).toEqual(['billing', 'iam']);
		expect(rows[0].roles.map((roleRow) => roleRow.role.name)).toEqual(['REFUNDER', 'PAYER']);
	});

	it('never exposes the password hash of any user in the response', async () => {
		await grantInternalUserRole(testApp.dataSource, userId, iam.adminRole);

		const response = await send().expect(200);

		expect(response.text).not.toMatch(SECRET_PATTERN);
	});

	it('does not include assignments of other users', async () => {
		const otherId = (
			await createInternalUser(testApp.dataSource, {
				email: 'other@example.com',
			})
		).id;
		await grantInternalUserApplication(testApp.dataSource, otherId, iam.iamApplication.id);

		const response = await send().expect(200);

		expect(userOf(response).applications).toEqual([]);
	});

	describe('errors', () => {
		it('returns 404 when the user does not exist', async () => {
			const response = await send(adminAuthorization(), 999999).expect(404);

			expect(response.body).toEqual({ ok: false, msg: 'Internal user not found', data: null });
		});

		it('returns 400 when the id is not numeric', async () => {
			const response = await send(adminAuthorization(), 'abc').expect(400);

			expect(response.body).toEqual({
				ok: false,
				msg: 'Validation failed (numeric string is expected)',
				data: null,
			});
		});

		it('returns 400 when the id is a decimal number', async () => {
			await send(adminAuthorization(), '1.5').expect(400);
		});
	});

	describe('authorization', () => {
		it('returns 401 without a bearer token', async () => {
			const response = await send(null).expect(401);

			expect(response.body).toEqual({
				ok: false,
				msg: 'Missing or malformed bearer token',
				data: null,
			});
		});

		it('returns 401 when the Authorization header does not use the Bearer scheme', async () => {
			const response = await send('Basic dXNlcjpwYXNz').expect(401);

			expect(bodyOf<ErrorBody>(response).msg).toBe('Missing or malformed bearer token');
		});

		it('returns 401 when the token is not a JWT', async () => {
			const response = await send('Bearer not-a-jwt').expect(401);

			expect(bodyOf<ErrorBody>(response).msg).toBe('Invalid or expired token');
		});

		it('returns 401 when the token is signed with a key the app does not trust', async () => {
			const response = await send(authorizationSignedByAnotherKey()).expect(401);

			expect(bodyOf<ErrorBody>(response).msg).toBe('Invalid or expired token');
		});

		it('returns 401 when the token is expired', async () => {
			const response = await send(expiredAuthorization()).expect(401);

			expect(bodyOf<ErrorBody>(response).msg).toBe('Invalid or expired token');
		});

		it('returns 403 when the token was issued for another application, even with the ADMIN role', async () => {
			const response = await send(authorizationHeaderFor({ applicationName: 'ticket-hub' })).expect(
				403,
			);

			expect(bodyOf<ErrorBody>(response).msg).toBe(
				'This token was not issued for the iam application',
			);
		});

		it('returns 403 when the token only has a role other than ADMIN', async () => {
			const response = await send(authorizationHeaderFor({ roles: ['VIEWER'] })).expect(403);

			expect(bodyOf<ErrorBody>(response).msg).toBe('You do not have the required role');
		});

		it('returns 403 when the token carries no roles (deny by default)', async () => {
			const response = await send(authorizationHeaderFor({ roles: [] })).expect(403);

			expect(bodyOf<ErrorBody>(response).msg).toBe('You do not have the required role');
		});

		it('returns 500 with the generic message when a verified token has no apps claim (documents current behavior)', async () => {
			const response = await send(
				authorizationHeaderForClaims({ email: 'admin@example.com' }),
			).expect(500);

			expect(response.body).toEqual({
				ok: false,
				msg: 'An unexpected error occurred. Please try again later.',
				data: null,
			});
		});
	});
});
