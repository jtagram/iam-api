import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import {
	createApplication,
	createInternalUser,
	createRole,
	grantInternalUserApplication,
	grantInternalUserRole,
	SeededIam,
	seedIamAdmin,
} from '../helpers/seed';
import { ApplicationEntity } from '../../src/common/database/application/application.entity';
import { RoleEntity } from '../../src/common/database/role/role.entity';
import { InternalUserEntity } from '../../src/common/database/internal-user/internal-user.entity';
import { AppTestApp, createAppTestApp } from '../helpers/app-test-app';
import {
	adminAuthorization,
	authorizationHeaderFor,
	authorizationSignedByAnotherKey,
	expiredAuthorization,
} from '../helpers/test-auth';
import { bodyOf, dataOf, ErrorBody } from '../helpers/response-types';

describe('GET /internal-users/with-applications (e2e)', () => {
	let testApp: AppTestApp;
	let iam: SeededIam;

	beforeAll(async () => {
		testApp = await createAppTestApp();
	});

	beforeEach(async () => {
		await testApp.resetTables();
		iam = await seedIamAdmin(testApp.dataSource);
	});

	afterAll(async () => {
		await testApp.close();
	});

	function send(authorization: string | null = adminAuthorization()) {
		const req = testApp.http().get('/internal-users/with-applications');
		if (authorization) {
			req.set('Authorization', authorization);
		}
		return req;
	}

	it('returns 200 with the entity tree in the {ok, msg, data} envelope', async () => {
		const response = await send().expect(200);

		const body = response.body as { ok: boolean; msg: string; data: unknown[] };
		expect(body.ok).toBe(true);
		expect(body.msg).toBe('Internal users with applications retrieved successfully');
		expect(body.data).toHaveLength(1);
		expect(body.data[0]).toMatchObject({
			id: iam.adminUser.id,
			name: 'Admin',
			lastname: 'Istrator',
			email: 'admin@example.com',
			applications: [
				{
					internalUserId: iam.adminUser.id,
					applicationId: iam.iamApplication.id,
					application: {
						id: iam.iamApplication.id,
						name: 'iam',
						description: 'Identity and access management',
					},
					roles: [
						{
							roleId: iam.adminRole.id,
							role: { id: iam.adminRole.id, name: 'ADMIN', description: 'Administrator' },
						},
					],
				},
			],
		});
	});

	it('never exposes any password hash in the response', async () => {
		await createInternalUser(testApp.dataSource, { email: 'other@example.com' });

		const response = await send().expect(200);

		expect(response.text).not.toMatch(/password|\$2[aby]\$/);
	});

	it('groups applications and roles under the user they belong to', async () => {
		const billing = await createApplication(testApp.dataSource, 'billing');
		const payer = await createRole(testApp.dataSource, billing.id, 'PAYER');
		const other = await createInternalUser(testApp.dataSource, { email: 'other@example.com' });
		await createInternalUser(testApp.dataSource, { email: 'lonely@example.com' });
		await grantInternalUserApplication(testApp.dataSource, other.id, billing.id);
		await grantInternalUserRole(testApp.dataSource, other.id, payer);

		const data = dataOf<InternalUserEntity[]>(await send().expect(200));
		const byEmail = Object.fromEntries(data.map((user) => [user.email, user.applications]));

		expect(byEmail['other@example.com']).toHaveLength(1);
		expect(byEmail['other@example.com'][0]).toMatchObject({
			applicationId: billing.id,
			application: { id: billing.id, name: 'billing', description: 'billing description' },
			roles: [
				{
					roleId: payer.id,
					role: { id: payer.id, name: 'PAYER', description: 'PAYER description' },
				},
			],
		});
		expect(byEmail['lonely@example.com']).toEqual([]);
		expect(byEmail['admin@example.com'].map((entry) => entry.application.name)).toEqual(['iam']);
	});

	it('orders applications and roles of a user newest first', async () => {
		const billing = await createApplication(testApp.dataSource, 'billing');
		const payer = await createRole(testApp.dataSource, billing.id, 'PAYER');
		const refunder = await createRole(testApp.dataSource, billing.id, 'REFUNDER');
		await grantInternalUserRole(testApp.dataSource, iam.adminUser.id, payer);
		await grantInternalUserRole(testApp.dataSource, iam.adminUser.id, refunder);
		await testApp.dataSource
			.getRepository(ApplicationEntity)
			.update(iam.iamApplication.id, { createdAt: new Date(Date.UTC(2024, 0, 1)) });
		await testApp.dataSource
			.getRepository(ApplicationEntity)
			.update(billing.id, { createdAt: new Date(Date.UTC(2024, 0, 2)) });
		const roles = testApp.dataSource.getRepository(RoleEntity);
		await roles.update(payer.id, { createdAt: new Date(Date.UTC(2024, 0, 3)) });
		await roles.update(refunder.id, { createdAt: new Date(Date.UTC(2024, 0, 4)) });

		const [user] = dataOf<InternalUserEntity[]>(await send().expect(200));

		expect(user.applications.map((row) => row.application.name)).toEqual(['billing', 'iam']);
		expect(user.applications[0].roles.map((row) => row.role.name)).toEqual(['REFUNDER', 'PAYER']);
	});

	it('lists the application a granted role hangs off', async () => {
		const billing = await createApplication(testApp.dataSource, 'billing');
		const payer = await createRole(testApp.dataSource, billing.id, 'PAYER');
		const other = await createInternalUser(testApp.dataSource, { email: 'other@example.com' });
		await grantInternalUserRole(testApp.dataSource, other.id, payer);

		const data = dataOf<InternalUserEntity[]>(await send().expect(200));

		const user = data.find((entry) => entry.id === other.id);
		expect(user?.applications.map((entry) => entry.applicationId)).toEqual([billing.id]);
	});

	it('orders the users by creation date, most recent first', async () => {
		const older = await createInternalUser(testApp.dataSource, { email: 'older@example.com' });
		const newer = await createInternalUser(testApp.dataSource, { email: 'newer@example.com' });
		const repository = testApp.dataSource.getRepository(InternalUserEntity);
		await repository.update(iam.adminUser.id, { createdAt: new Date(Date.UTC(2024, 0, 1)) });
		await repository.update(older.id, { createdAt: new Date(Date.UTC(2024, 0, 2)) });
		await repository.update(newer.id, { createdAt: new Date(Date.UTC(2024, 0, 3)) });

		const data = dataOf<InternalUserEntity[]>(await send().expect(200));

		expect(data.map((user) => user.id)).toEqual([newer.id, older.id, iam.adminUser.id]);
	});

	it('is not captured by the ":id" routes', async () => {
		const response = await send().expect(200);

		expect(Array.isArray(dataOf<unknown[]>(response))).toBe(true);
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
	});
});
