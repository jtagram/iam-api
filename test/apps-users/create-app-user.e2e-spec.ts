import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import * as bcrypt from 'bcrypt';
import { AppUserEntity } from '../../src/common/database/app-user/app-user.entity';
import { AppTestApp, createAppTestApp } from '../helpers/app-test-app';
import { seedIamAdmin } from '../helpers/seed';
import {
	adminAuthorization,
	authorizationHeaderFor,
	authorizationHeaderForClaims,
	authorizationSignedByAnotherKey,
	expiredAuthorization,
} from '../helpers/test-auth';
import { bodyOf, dataOf, ErrorBody } from '../helpers/response-types';
import { AppUserCreatedResponse } from '../../src/modules/apps-users/dto/app-user-created-response.dto';

describe('POST /apps-users (e2e)', () => {
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

	function validBody(overrides: Record<string, unknown> = {}) {
		return {
			name: 'Billing service',
			description: 'Calls the billing API',
			...overrides,
		};
	}

	function send(authorization: string | null = adminAuthorization(), body: object = validBody()) {
		const req = testApp.http().post('/apps-users');
		if (authorization) {
			req.set('Authorization', authorization);
		}
		return req.send(body);
	}

	function appUserCount() {
		return testApp.dataSource.getRepository(AppUserEntity).count();
	}

	describe('creation', () => {
		it('returns 201 with the generated credentials in the {msg, data} envelope', async () => {
			const response = await send().expect(201);

			expect(response.body).toEqual({
				ok: true,
				msg: 'Application user created successfully — store clienteSecret now, it cannot be retrieved again',
				data: {
					id: expect.any(Number),
					clienteId: expect.any(String),
					clienteSecret: expect.any(String),
					name: 'Billing service',
					description: 'Calls the billing API',
				},
			});
		});

		it('generates a clienteId of at most 15 url-safe characters and a 43 character secret', async () => {
			const response = await send().expect(201);

			expect(dataOf<AppUserCreatedResponse>(response).clienteId).toMatch(/^[A-Za-z0-9_-]{1,15}$/);
			expect(dataOf<AppUserCreatedResponse>(response).clienteSecret).toMatch(/^[A-Za-z0-9_-]{43}$/);
		});

		it('persists the user storing only a bcrypt hash of the secret', async () => {
			const response = await send().expect(201);

			const row = await testApp.dataSource
				.getRepository(AppUserEntity)
				.findOneByOrFail({ id: dataOf<AppUserCreatedResponse>(response).id });
			expect(row.clienteId).toBe(dataOf<AppUserCreatedResponse>(response).clienteId);
			expect(row.name).toBe('Billing service');
			expect(row.description).toBe('Calls the billing API');
			expect(row.clienteSecret).not.toBe(dataOf<AppUserCreatedResponse>(response).clienteSecret);
			expect(row.clienteSecret).toMatch(/^\$2[aby]\$10\$/);
			expect(
				await bcrypt.compare(
					dataOf<AppUserCreatedResponse>(response).clienteSecret,
					row.clienteSecret,
				),
			).toBe(true);
		});

		it('generates different credentials for every user', async () => {
			const first = await send(adminAuthorization(), validBody({ name: 'First' })).expect(201);
			const second = await send(adminAuthorization(), validBody({ name: 'Second' })).expect(201);

			expect(dataOf<AppUserCreatedResponse>(second).clienteId).not.toBe(
				dataOf<AppUserCreatedResponse>(first).clienteId,
			);
			expect(dataOf<AppUserCreatedResponse>(second).clienteSecret).not.toBe(
				dataOf<AppUserCreatedResponse>(first).clienteSecret,
			);
			expect(await appUserCount()).toBe(2);
		});

		it('ignores credentials supplied by the client (whitelist)', async () => {
			const response = await send(
				adminAuthorization(),
				validBody({
					clienteId: 'chosen-id',
					clienteSecret: 'chosen-secret',
					id: 999,
				}),
			).expect(201);

			expect(dataOf<AppUserCreatedResponse>(response).clienteId).not.toBe('chosen-id');
			expect(dataOf<AppUserCreatedResponse>(response).clienteSecret).not.toBe('chosen-secret');
			expect(dataOf<AppUserCreatedResponse>(response).id).not.toBe(999);
		});

		it('accepts a name of exactly 30 characters', async () => {
			await send(adminAuthorization(), validBody({ name: 'n'.repeat(30) })).expect(201);
		});
	});

	describe('validation', () => {
		it('returns 400 when the body is empty', async () => {
			const response = await send(adminAuthorization(), {}).expect(400);

			expect(bodyOf<ErrorBody>(response).msg).toContain('name must be a string');
			expect(bodyOf<ErrorBody>(response).msg).toContain('description must be a string');
		});

		it('returns 400 when the name is empty', async () => {
			const response = await send(adminAuthorization(), validBody({ name: '' })).expect(400);

			expect(bodyOf<ErrorBody>(response).msg).toBe('name should not be empty');
		});

		it('returns 400 when the description is empty', async () => {
			const response = await send(adminAuthorization(), validBody({ description: '' })).expect(400);

			expect(bodyOf<ErrorBody>(response).msg).toBe('description should not be empty');
		});

		it('returns 400 when the name is longer than 30 characters', async () => {
			const response = await send(adminAuthorization(), validBody({ name: 'n'.repeat(31) })).expect(
				400,
			);

			expect(bodyOf<ErrorBody>(response).msg).toBe(
				'name must be shorter than or equal to 30 characters',
			);
		});

		it('returns 400 when the description is longer than 200 characters', async () => {
			const response = await send(
				adminAuthorization(),
				validBody({ description: 'd'.repeat(201) }),
			).expect(400);

			expect(bodyOf<ErrorBody>(response).msg).toBe(
				'description must be shorter than or equal to 200 characters',
			);
		});

		it('returns 400 when a field is not a string', async () => {
			await send(adminAuthorization(), validBody({ name: 42 })).expect(400);
		});

		it('does not persist anything when validation fails', async () => {
			await send(adminAuthorization(), {}).expect(400);

			expect(await appUserCount()).toBe(0);
		});
	});

	describe('name uniqueness', () => {
		it('returns 409 when an application user with that name already exists', async () => {
			await send().expect(201);

			const response = await send().expect(409);

			expect(bodyOf<ErrorBody>(response).ok).toBe(false);
			expect(bodyOf<ErrorBody>(response).msg).toBe(
				'An application user with this name already exists',
			);
		});

		it('does not create a second application user when the name is taken', async () => {
			await send().expect(201);
			await send().expect(409);

			expect(await appUserCount()).toBe(1);
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
