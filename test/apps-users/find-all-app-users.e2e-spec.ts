import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { createAppUser, seedIamAdmin } from '../helpers/seed';
import { AppUserEntity } from '../../src/common/database/app-user/app-user.entity';
import { AppTestApp, createAppTestApp } from '../helpers/app-test-app';
import {
	adminAuthorization,
	authorizationHeaderFor,
	authorizationHeaderForClaims,
	authorizationSignedByAnotherKey,
	expiredAuthorization,
} from '../helpers/test-auth';
import { bodyOf, dataOf, ErrorBody } from '../helpers/response-types';
import { AppUserResponse } from '../../src/modules/apps-users/dto/app-user-response.dto';

describe('GET /apps-users (e2e)', () => {
	let testApp: AppTestApp;

	beforeAll(async () => {
		testApp = await createAppTestApp();
	});

	beforeEach(async () => {
		await testApp.resetTables();
		await seedIamAdmin(testApp.dataSource);
	});

	afterAll(async () => {
		await testApp.close();
	});

	function send(authorization: string | null = adminAuthorization()) {
		const req = testApp.http().get('/apps-users');
		if (authorization) {
			req.set('Authorization', authorization);
		}
		return req;
	}

	it('returns 200 with the stored application users in the {msg, data} envelope', async () => {
		const first = await createAppUser(testApp.dataSource, {
			clienteId: 'client-a',
			name: 'Alpha',
			description: 'First',
		});

		const response = await send().expect(200);

		expect(response.body).toEqual({
			ok: true,
			msg: 'Application users retrieved successfully',
			data: [
				{
					id: first.entity.id,
					clienteId: 'client-a',
					name: 'Alpha',
					description: 'First',
				},
			],
		});
	});

	it('returns every application user, the most recently created first', async () => {
		const older = await createAppUser(testApp.dataSource, { clienteId: 'client-a' });
		await createAppUser(testApp.dataSource, { clienteId: 'client-b' });
		await testApp.dataSource
			.getRepository(AppUserEntity)
			.update(older.entity.id, { createdAt: new Date('2024-01-01T00:00:00Z') });

		const response = await send().expect(200);

		expect(dataOf<AppUserResponse[]>(response).map((u) => u.clienteId)).toEqual([
			'client-b',
			'client-a',
		]);
	});

	it('never exposes the stored secret hash', async () => {
		await createAppUser(testApp.dataSource, { clienteId: 'client-a' });

		const response = await send().expect(200);

		expect(Object.keys(dataOf<AppUserResponse[]>(response)[0]).sort()).toEqual([
			'clienteId',
			'description',
			'id',
			'name',
		]);
		expect(JSON.stringify(response.body)).not.toContain('$2');
	});

	it('returns an empty list when there are no application users', async () => {
		const response = await send().expect(200);

		expect(response.body).toEqual({
			ok: true,
			msg: 'Application users retrieved successfully',
			data: [],
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
