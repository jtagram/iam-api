import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { createApplication, createRole, SeededIam, seedIamAdmin } from '../helpers/seed';
import { ApplicationEntity } from '../../src/common/database/application/application.entity';
import { RoleEntity } from '../../src/common/database/role/role.entity';
import { AppTestApp, createAppTestApp } from '../helpers/app-test-app';
import {
	adminAuthorization,
	authorizationHeaderFor,
	authorizationSignedByAnotherKey,
	expiredAuthorization,
} from '../helpers/test-auth';
import { bodyOf, dataOf, ErrorBody } from '../helpers/response-types';
import { ApplicationRolesResponse } from '../../src/modules/roles/dto/application-roles-response.dto';

describe('GET /roles/grouped-by-application (e2e)', () => {
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
		const req = testApp.http().get('/roles/grouped-by-application');
		if (authorization) {
			req.set('Authorization', authorization);
		}
		return req;
	}

	/** Gives each entity a distinct, increasing creation date so the ordering never depends on the clock. */
	async function setCreationOrder(
		target: typeof ApplicationEntity | typeof RoleEntity,
		ids: number[],
	) {
		for (const [index, id] of ids.entries()) {
			await testApp.dataSource
				.getRepository<ApplicationEntity | RoleEntity>(target)
				.update(id, { createdAt: new Date(Date.UTC(2024, 0, 1 + index)) });
		}
	}

	it('returns 200 with every application and its roles in the {ok, msg, data} envelope', async () => {
		const response = await send().expect(200);

		expect(response.body).toEqual({
			ok: true,
			msg: 'Roles grouped by application retrieved successfully',
			data: [
				{
					applicationId: iam.iamApplication.id,
					applicationName: 'iam',
					applicationDescription: 'Identity and access management',
					roles: [{ id: iam.adminRole.id, name: 'ADMIN', description: 'Administrator' }],
				},
			],
		});
	});

	it('groups the roles under their own application, including applications without roles', async () => {
		const billing = await createApplication(testApp.dataSource, 'billing');
		const payer = await createRole(testApp.dataSource, billing.id, 'PAYER');
		const reports = await createApplication(testApp.dataSource, 'reports');
		await setCreationOrder(ApplicationEntity, [iam.iamApplication.id, billing.id, reports.id]);

		const response = await send().expect(200);

		expect(dataOf<ApplicationRolesResponse[]>(response)).toEqual([
			{
				applicationId: reports.id,
				applicationName: 'reports',
				applicationDescription: 'reports description',
				roles: [],
			},
			{
				applicationId: billing.id,
				applicationName: 'billing',
				applicationDescription: 'billing description',
				roles: [{ id: payer.id, name: 'PAYER', description: 'PAYER description' }],
			},
			{
				applicationId: iam.iamApplication.id,
				applicationName: 'iam',
				applicationDescription: 'Identity and access management',
				roles: [{ id: iam.adminRole.id, name: 'ADMIN', description: 'Administrator' }],
			},
		]);
	});

	it('orders applications and the roles of each application by creation date, most recent first', async () => {
		const billing = await createApplication(testApp.dataSource, 'billing');
		const zeta = await createRole(testApp.dataSource, billing.id, 'ZETA');
		const alpha = await createRole(testApp.dataSource, billing.id, 'ALPHA');
		const editor = await createRole(testApp.dataSource, iam.iamApplication.id, 'EDITOR');
		await setCreationOrder(ApplicationEntity, [iam.iamApplication.id, billing.id]);
		await setCreationOrder(RoleEntity, [iam.adminRole.id, editor.id, zeta.id, alpha.id]);

		const data = dataOf<ApplicationRolesResponse[]>(await send().expect(200));

		expect(data.map((application) => application.applicationId)).toEqual([
			billing.id,
			iam.iamApplication.id,
		]);
		expect(data[0].roles.map((role) => role.id)).toEqual([alpha.id, zeta.id]);
		expect(data[1].roles.map((role) => role.id)).toEqual([editor.id, iam.adminRole.id]);
	});

	it('returns an empty list when there are no applications', async () => {
		await testApp.resetTables();

		const response = await send().expect(200);

		expect(response.body).toEqual({
			ok: true,
			msg: 'Roles grouped by application retrieved successfully',
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
