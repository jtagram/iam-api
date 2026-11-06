import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { createInternalUser, SeededIam, seedIamAdmin } from '../helpers/seed';
import { InternalUserEntity } from '../../src/common/database/internal-user/internal-user.entity';
import { AppTestApp, createAppTestApp } from '../helpers/app-test-app';
import {
	adminAuthorization,
	authorizationHeaderFor,
	authorizationHeaderForClaims,
	authorizationSignedByAnotherKey,
	expiredAuthorization,
} from '../helpers/test-auth';
import { bodyOf, dataOf, ErrorBody } from '../helpers/response-types';
import { InternalUserResponse } from '../../src/modules/internal-users/dto/internal-user-response.dto';

describe('GET /internal-users (e2e)', () => {
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
		const req = testApp.http().get('/internal-users');
		if (authorization) {
			req.set('Authorization', authorization);
		}
		return req;
	}

	it('returns 200 with the internal users as a bare array', async () => {
		const response = await send().expect(200);

		expect(response.body).toEqual({
			ok: true,
			msg: 'Internal users retrieved successfully',
			data: [
				{
					id: iam.adminUser.id,
					name: 'Admin',
					lastname: 'Istrator',
					email: 'admin@example.com',
				},
			],
		});
	});

	it('returns every internal user, the most recently created first', async () => {
		const repository = testApp.dataSource.getRepository(InternalUserEntity);
		const older = await createInternalUser(testApp.dataSource, { email: 'a@example.com' });
		const newer = await createInternalUser(testApp.dataSource, { email: 'b@example.com' });
		await repository.update(iam.adminUser.id, { createdAt: new Date('2024-01-01T00:00:00Z') });
		await repository.update(older.id, { createdAt: new Date('2024-02-01T00:00:00Z') });
		await repository.update(newer.id, { createdAt: new Date('2024-03-01T00:00:00Z') });

		const response = await send().expect(200);

		expect(dataOf<InternalUserResponse[]>(response).map((user) => user.email)).toEqual([
			'b@example.com',
			'a@example.com',
			'admin@example.com',
		]);
	});

	it('never exposes the stored password hash', async () => {
		const response = await send().expect(200);

		expect(Object.keys(dataOf<InternalUserResponse[]>(response)[0]).sort()).toEqual([
			'email',
			'id',
			'lastname',
			'name',
		]);
		expect(JSON.stringify(dataOf<unknown>(response))).not.toContain('$2');
	});

	it('returns an empty array when there are no internal users', async () => {
		await testApp.resetTables();

		const response = await send().expect(200);

		expect(response.body).toEqual({
			ok: true,
			msg: 'Internal users retrieved successfully',
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
