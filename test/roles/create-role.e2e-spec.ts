import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { ApplicationEntity } from '../../src/common/database/application/application.entity';
import { RoleEntity } from '../../src/common/database/role/role.entity';
import { createApplication, createRole } from '../helpers/seed';
import { RolesRepository } from '../../src/common/database/role/roles.repository';
import { createBarrier } from '../helpers/concurrency';
import { AppTestApp, createAppTestApp } from '../helpers/app-test-app';
import { SeededIam, seedIamAdmin } from '../helpers/seed';
import {
  adminAuthorization,
  authorizationHeaderFor,
  authorizationHeaderForClaims,
  authorizationSignedByAnotherKey,
  expiredAuthorization,
} from '../helpers/test-auth';

describe('POST /roles (e2e)', () => {
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

  function validBody(overrides: Record<string, unknown> = {}) {
    return {
      applicationId: iam.iamApplication.id,
      name: 'EDITOR',
      description: 'Can edit content',
      ...overrides,
    };
  }

  function send(
    authorization: string | null = adminAuthorization(),
    body: object = validBody(),
  ) {
    const req = testApp.http().post('/roles');
    if (authorization) {
      req.set('Authorization', authorization);
    }
    return req.send(body);
  }

  function roleCount() {
    return testApp.dataSource.getRepository(RoleEntity).count();
  }

  describe('creation', () => {
    it('returns 201 with the created role in the {msg, data} envelope', async () => {
      const response = await send().expect(201);

      expect(response.body).toEqual({
        msg: 'Role created successfully',
        data: {
          id: expect.any(Number),
          applicationId: iam.iamApplication.id,
          name: 'EDITOR',
          description: 'Can edit content',
        },
      });
    });

    it('persists the role in the database', async () => {
      const response = await send().expect(201);

      const row = await testApp.dataSource
        .getRepository(RoleEntity)
        .findOneByOrFail({ id: response.body.data.id });
      expect(row.applicationId).toBe(iam.iamApplication.id);
      expect(row.name).toBe('EDITOR');
      expect(row.description).toBe('Can edit content');
      expect(await roleCount()).toBe(2);
    });

    it('allows the same role name in a different application', async () => {
      const billing = await createApplication(testApp.dataSource, 'billing');

      await send(
        adminAuthorization(),
        validBody({ applicationId: billing.id, name: 'ADMIN' }),
      ).expect(201);

      expect(await roleCount()).toBe(2);
    });

    it('accepts a name of exactly 20 characters', async () => {
      await send(
        adminAuthorization(),
        validBody({ name: 'R'.repeat(20) }),
      ).expect(201);
    });

    it('ignores unknown properties (whitelist)', async () => {
      const response = await send(
        adminAuthorization(),
        validBody({ id: 999, extra: 'ignored' }),
      ).expect(201);

      expect(response.body.data.id).not.toBe(999);
      expect(response.body.data).not.toHaveProperty('extra');
    });
  });

  describe('validation', () => {
    it('returns 400 when the body is empty', async () => {
      const response = await send(adminAuthorization(), {}).expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toEqual(
        expect.arrayContaining([
          'applicationId must be an integer number',
          'name must be a string',
          'description must be a string',
        ]),
      );
    });

    it('returns 400 when applicationId is a numeric string (no implicit conversion in the body)', async () => {
      const response = await send(
        adminAuthorization(),
        validBody({ applicationId: String(iam.iamApplication.id) }),
      ).expect(400);

      expect(response.body.message).toEqual([
        'applicationId must be an integer number',
      ]);
    });

    it('returns 400 when applicationId is not an integer', async () => {
      await send(
        adminAuthorization(),
        validBody({ applicationId: 1.5 }),
      ).expect(400);
    });

    it('returns 400 when the name is longer than 20 characters', async () => {
      const response = await send(
        adminAuthorization(),
        validBody({ name: 'R'.repeat(21) }),
      ).expect(400);

      expect(response.body.message).toEqual([
        'name must be shorter than or equal to 20 characters',
      ]);
    });

    it('returns 400 when the description is longer than 200 characters', async () => {
      const response = await send(
        adminAuthorization(),
        validBody({ description: 'd'.repeat(201) }),
      ).expect(400);

      expect(response.body.message).toEqual([
        'description must be shorter than or equal to 200 characters',
      ]);
    });

    it('does not persist anything when validation fails', async () => {
      await send(
        adminAuthorization(),
        validBody({ name: 'R'.repeat(21) }),
      ).expect(400);

      expect(await roleCount()).toBe(1);
    });
  });

  describe('not found', () => {
    it('returns 404 when the application does not exist', async () => {
      const response = await send(
        adminAuthorization(),
        validBody({ applicationId: 999999 }),
      ).expect(404);

      expect(response.body).toEqual({
        statusCode: 404,
        error: 'Not Found',
        message: 'Application not found',
      });
      expect(await roleCount()).toBe(1);
    });
  });

  describe('conflicts', () => {
    it('returns 409 when the application already has a role with that name', async () => {
      await send().expect(201);

      const response = await send().expect(409);

      expect(response.body).toEqual({
        statusCode: 409,
        error: 'Conflict',
        message: 'A role with this name already exists for this application',
      });
      expect(await roleCount()).toBe(2);
    });

    it('returns 409 for the seeded ADMIN role of the iam application', async () => {
      await send(adminAuthorization(), validBody({ name: 'ADMIN' })).expect(
        409,
      );
    });

    it('answers 500 with the generic message to the loser of a concurrent duplicate creation and persists a single row (documents current behavior)', async () => {
      const barrier = createBarrier(2);
      const original = RolesRepository.prototype.findAllByApplicationIdAndNames;
      const spy = jest
        .spyOn(RolesRepository.prototype, 'findAllByApplicationIdAndNames')
        .mockImplementation(async function (
          this: RolesRepository,
          applicationId: number,
          names: string[],
        ) {
          await barrier.arrive();
          return original.call(this, applicationId, names);
        });

      try {
        const [first, second] = await Promise.all([send(), send()]);

        expect([first.status, second.status].sort()).toEqual([201, 500]);
        const failed = first.status === 500 ? first : second;
        expect(failed.body).toEqual({
          statusCode: 500,
          message: 'An unexpected error occurred. Please try again later.',
        });
        const rows = await testApp.dataSource
          .getRepository(RoleEntity)
          .findBy({ name: 'EDITOR' });
        expect(rows).toHaveLength(1);
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('authorization', () => {
    it('returns 401 without a bearer token', async () => {
      const response = await send(null).expect(401);

      expect(response.body).toEqual({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Missing or malformed bearer token',
      });
    });

    it('returns 401 when the Authorization header does not use the Bearer scheme', async () => {
      const response = await send('Basic dXNlcjpwYXNz').expect(401);

      expect(response.body.message).toBe('Missing or malformed bearer token');
    });

    it('returns 401 when the token is not a JWT', async () => {
      const response = await send('Bearer not-a-jwt').expect(401);

      expect(response.body.message).toBe('Invalid or expired token');
    });

    it('returns 401 when the token is signed with a key the app does not trust', async () => {
      const response = await send(authorizationSignedByAnotherKey()).expect(
        401,
      );

      expect(response.body.message).toBe('Invalid or expired token');
    });

    it('returns 401 when the token is expired', async () => {
      const response = await send(expiredAuthorization()).expect(401);

      expect(response.body.message).toBe('Invalid or expired token');
    });

    it('returns 403 when the token was issued for another application, even with the ADMIN role', async () => {
      const response = await send(
        authorizationHeaderFor({ applicationName: 'ticket-hub' }),
      ).expect(403);

      expect(response.body.message).toBe(
        'This token was not issued for the iam application',
      );
    });

    it('returns 403 when the token only has a role other than ADMIN', async () => {
      const response = await send(
        authorizationHeaderFor({ roles: ['VIEWER'] }),
      ).expect(403);

      expect(response.body.message).toBe('You do not have the required role');
    });

    it('returns 403 when the token carries no roles (deny by default)', async () => {
      const response = await send(authorizationHeaderFor({ roles: [] })).expect(
        403,
      );

      expect(response.body.message).toBe('You do not have the required role');
    });

    it('returns 500 with the generic message when a verified token has no apps claim (documents current behavior)', async () => {
      const response = await send(
        authorizationHeaderForClaims({ email: 'admin@example.com' }),
      ).expect(500);

      expect(response.body).toEqual({
        statusCode: 500,
        message: 'An unexpected error occurred. Please try again later.',
      });
    });
  });
});
