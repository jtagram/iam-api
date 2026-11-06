import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import {
	createAppUser,
	connectAppUser,
	createApplication,
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
import { bodyOf, dataOf, ErrorBody, UserWithConnectionsBody } from '../helpers/response-types';
import { AppUserConnectionEntity } from '../../src/common/database/app-user-connection/app-user-connection.entity';

describe('GET /apps-users/:id/connections (e2e)', () => {
	let testApp: AppTestApp;
	let iam: SeededIam;

	beforeAll(async () => {
		testApp = await createAppTestApp();
	});

	beforeEach(async () => {
		await testApp.resetTables();
		iam = await seedIamAdmin(testApp.dataSource);
		userId = (await createAppUser(testApp.dataSource)).entity.id;
	});

	afterAll(async () => {
		await testApp.close();
	});

	let userId: number;

	function send(authorization: string | null = adminAuthorization(), id: string | number = userId) {
		const req = testApp.http().get(`/apps-users/${id}/connections`);
		if (authorization) {
			req.set('Authorization', authorization);
		}
		return req;
	}

	it('returns 200 with the user and an empty connection list when it has no connections', async () => {
		const response = await send().expect(200);

		expect(bodyOf<{ ok: boolean; msg: string }>(response)).toMatchObject({
			ok: true,
			msg: 'Connections retrieved successfully',
		});
		expect(dataOf<UserWithConnectionsBody>(response)).toMatchObject({
			id: userId,
			connections: [],
		});
	});

	it('returns the user with its connections and both applications loaded', async () => {
		const connection = await connectAppUser(
			testApp.dataSource,
			userId,
			iam.iamApplication.id,
			iam.iamApplication.id,
		);

		const response = await send().expect(200);

		const user = dataOf<UserWithConnectionsBody>(response);
		expect(user.id).toBe(userId);
		expect(user.connections).toHaveLength(1);
		expect(user.connections[0]).toMatchObject({
			id: connection.id,
			appUserId: userId,
			originApplicationId: iam.iamApplication.id,
			destinationApplicationId: iam.iamApplication.id,
			originApplication: { id: iam.iamApplication.id, name: 'iam' },
			destinationApplication: { id: iam.iamApplication.id, name: 'iam' },
		});
	});

	it('returns several connections, the most recently created first, origin and destination kept apart', async () => {
		const billing = await createApplication(testApp.dataSource, 'billing');
		const first = await connectAppUser(
			testApp.dataSource,
			userId,
			iam.iamApplication.id,
			billing.id,
		);
		const second = await connectAppUser(
			testApp.dataSource,
			userId,
			billing.id,
			iam.iamApplication.id,
		);
		const repository = testApp.dataSource.getRepository(AppUserConnectionEntity);
		await repository.update(first.id, { createdAt: new Date('2024-01-01T00:00:00Z') });
		await repository.update(second.id, { createdAt: new Date('2024-02-01T00:00:00Z') });

		const response = await send().expect(200);

		const { connections } = dataOf<UserWithConnectionsBody>(response);
		expect(connections.map((connection) => connection.id)).toEqual([second.id, first.id]);
		expect(
			connections.map((connection) => [
				connection.originApplication.name,
				connection.destinationApplication.name,
			]),
		).toEqual([
			['billing', 'iam'],
			['iam', 'billing'],
		]);
	});

	it('does not include connections of other users', async () => {
		const otherId = (await createAppUser(testApp.dataSource, { clienteId: 'other-client' })).entity
			.id;
		await connectAppUser(testApp.dataSource, otherId, iam.iamApplication.id, iam.iamApplication.id);

		const response = await send().expect(200);

		expect(dataOf<UserWithConnectionsBody>(response)).toMatchObject({
			id: userId,
			connections: [],
		});
	});

	it('never exposes secrets', async () => {
		await connectAppUser(testApp.dataSource, userId, iam.iamApplication.id, iam.iamApplication.id);

		const response = await send().expect(200);

		expect(response.text).not.toMatch(/password|\$2[aby]\$|clienteSecret/);
	});

	describe('errors', () => {
		it('returns 404 when the user does not exist', async () => {
			const response = await send(adminAuthorization(), 999999).expect(404);

			expect(response.body).toEqual({ ok: false, msg: 'Application user not found', data: null });
		});

		it('returns 400 when the id is not numeric', async () => {
			const response = await send(adminAuthorization(), 'abc').expect(400);

			expect(bodyOf<ErrorBody>(response).msg).toBe(
				'Validation failed (numeric string is expected)',
			);
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
