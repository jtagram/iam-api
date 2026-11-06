import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import {
	createApplication,
	createInternalUser,
	createRole,
	grantInternalUserApplication,
	SeededIam,
	seedIamAdmin,
} from '../helpers/seed';
import { InternalUserRoleEntity } from '../../src/common/database/internal-user/internal-user-role.entity';
import { InternalUserAppEntity } from '../../src/common/database/internal-user/internal-user-app.entity';
import { AppTestApp, createAppTestApp } from '../helpers/app-test-app';
import {
	adminAuthorization,
	authorizationHeaderFor,
	authorizationHeaderForClaims,
	authorizationSignedByAnotherKey,
	expiredAuthorization,
} from '../helpers/test-auth';
import { bodyOf, dataOf, ErrorBody } from '../helpers/response-types';

describe('POST /internal-users/:id/roles (e2e)', () => {
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
		await grantInternalUserApplication(testApp.dataSource, userId, iam.iamApplication.id);
		baseline = await testApp.dataSource.getRepository(InternalUserRoleEntity).count();
	});

	afterAll(async () => {
		await testApp.close();
	});

	let userId: number;

	function validBody(overrides: Record<string, unknown> = {}) {
		return { roleId: iam.adminRole.id, ...overrides };
	}

	function send(
		authorization: string | null = adminAuthorization(),
		body: object = validBody(),
		id: string | number = userId,
	) {
		const req = testApp.http().post(`/internal-users/${id}/roles`);
		if (authorization) {
			req.set('Authorization', authorization);
		}
		return req.send(body);
	}

	let baseline = 0;

	// Rows created by the test only: seedIamAdmin may already insert assignments.
	async function assignmentCount() {
		return (await testApp.dataSource.getRepository(InternalUserRoleEntity).count()) - baseline;
	}

	describe('assignment', () => {
		it('returns 201 with the user and its assignment tree', async () => {
			const response = await send().expect(201);

			expect(response.body).toMatchObject({
				ok: true,
				msg: 'Role assigned to internal user successfully',
				data: {
					id: userId,
					email: 'user@example.com',
					applications: [
						{
							internalUserId: userId,
							applicationId: iam.iamApplication.id,
							application: { id: iam.iamApplication.id, name: 'iam' },
							roles: [{ roleId: iam.adminRole.id, role: { id: iam.adminRole.id, name: 'ADMIN' } }],
						},
					],
				},
			});
		});

		it('never exposes the password in the response', async () => {
			const response = await send().expect(201);

			expect(response.text).not.toMatch(/password|\$2[aby]\$|clienteSecret/);
		});

		it('persists the role under the user assignment of the role application', async () => {
			await send().expect(201);

			const row = await testApp.dataSource.getRepository(InternalUserRoleEntity).findOneOrFail({
				where: { roleId: iam.adminRole.id, internalUserApplication: { internalUserId: userId } },
				relations: { internalUserApplication: true },
			});
			expect(row.roleId).toBe(iam.adminRole.id);
			expect(row.internalUserApplication).toMatchObject({
				internalUserId: userId,
				applicationId: iam.iamApplication.id,
			});
		});

		it('ignores an applicationId sent by the client (whitelist) and uses the role application', async () => {
			const response = await send(adminAuthorization(), validBody({ applicationId: 999 })).expect(
				201,
			);

			expect(
				dataOf<{ applications: { applicationId: number }[] }>(response).applications.map(
					(assignment) => assignment.applicationId,
				),
			).toEqual([iam.iamApplication.id]);
		});
	});

	describe('validation', () => {
		it('returns 400 when roleId is missing', async () => {
			const response = await send(adminAuthorization(), {}).expect(400);

			expect(bodyOf<ErrorBody>(response).msg).toBe(
				'roleId must be a positive number, roleId must be an integer number',
			);
		});

		it('returns 400 when roleId is 0', async () => {
			const response = await send(adminAuthorization(), validBody({ roleId: 0 })).expect(400);

			expect(bodyOf<ErrorBody>(response).msg).toBe('roleId must be a positive number');
		});

		it('returns 400 when roleId is a numeric string', async () => {
			await send(adminAuthorization(), validBody({ roleId: '1' })).expect(400);
		});

		it('returns 400 when the user id is not numeric', async () => {
			const response = await send(adminAuthorization(), validBody(), 'abc').expect(400);

			expect(bodyOf<ErrorBody>(response).msg).toBe(
				'Validation failed (numeric string is expected)',
			);
		});

		it('does not persist anything when validation fails', async () => {
			await send(adminAuthorization(), {}).expect(400);

			expect(await assignmentCount()).toBe(0);
		});
	});

	describe('not found', () => {
		it('returns 404 when the user does not exist', async () => {
			const response = await send(adminAuthorization(), validBody(), 999999).expect(404);

			expect(response.body).toEqual({ ok: false, msg: 'Internal user not found', data: null });
		});

		it('returns 404 when the role does not exist', async () => {
			const response = await send(adminAuthorization(), validBody({ roleId: 999999 })).expect(404);

			expect(response.body).toEqual({ ok: false, msg: 'Role not found', data: null });
			expect(await assignmentCount()).toBe(0);
		});
	});

	describe('conflicts', () => {
		it('returns 409 when the role is already assigned to the user', async () => {
			await send().expect(201);

			const response = await send().expect(409);

			expect(response.body).toEqual({
				ok: false,
				msg: 'Role already assigned to this user',
				data: null,
			});
			expect(await assignmentCount()).toBe(1);
		});

		it('returns 409 when the application of the role is not assigned to the user', async () => {
			const ticketHub = await createApplication(testApp.dataSource, 'ticket-hub');
			const viewer = await createRole(testApp.dataSource, ticketHub.id, 'VIEWER');

			const response = await send(adminAuthorization(), validBody({ roleId: viewer.id })).expect(
				409,
			);

			expect(response.body).toEqual({
				ok: false,
				msg: 'Application is not assigned to the user',
				data: null,
			});
			expect(await assignmentCount()).toBe(0);
		});

		it('assigns the role once the application has been assigned to the user', async () => {
			const ticketHub = await createApplication(testApp.dataSource, 'ticket-hub');
			const viewer = await createRole(testApp.dataSource, ticketHub.id, 'VIEWER');
			await send(adminAuthorization(), validBody({ roleId: viewer.id })).expect(409);
			await grantInternalUserApplication(testApp.dataSource, userId, ticketHub.id);

			const response = await send(adminAuthorization(), validBody({ roleId: viewer.id })).expect(
				201,
			);

			const { applications } = dataOf<{
				applications: { applicationId: number; roles: { roleId: number }[] }[];
			}>(response);
			expect(
				applications.find((assignment) => assignment.applicationId === ticketHub.id),
			).toMatchObject({
				roles: [{ roleId: viewer.id }],
			});
		});

		it('removes the roles of an application assignment when that assignment is deleted', async () => {
			await send().expect(201);
			expect(await assignmentCount()).toBe(1);

			await testApp.dataSource
				.getRepository(InternalUserAppEntity)
				.delete({ internalUserId: userId, applicationId: iam.iamApplication.id });

			expect(await assignmentCount()).toBe(0);
		});

		it('allows the same role to be assigned to a different user', async () => {
			await send().expect(201);
			const otherId = (
				await createInternalUser(testApp.dataSource, {
					email: 'other@example.com',
				})
			).id;
			await grantInternalUserApplication(testApp.dataSource, otherId, iam.iamApplication.id);

			await send(adminAuthorization(), validBody(), otherId).expect(201);

			expect(await assignmentCount()).toBe(2);
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
