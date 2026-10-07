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
import { ApplicationsRepository } from '../../src/common/database/application/applications.repository';
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

describe('POST /applications (e2e)', () => {
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
      name: 'billing',
      description: 'Billing application',
      ...overrides,
    };
  }

  function send(
    authorization: string | null = adminAuthorization(),
    body: object = validBody(),
  ) {
    const req = testApp.http().post('/applications');
    if (authorization) {
      req.set('Authorization', authorization);
    }
    return req.send(body);
  }

  function applicationCount() {
    return testApp.dataSource.getRepository(ApplicationEntity).count();
  }

  describe('creation', () => {
    it('returns 201 with the created application in the {msg, data} envelope', async () => {
      const response = await send().expect(201);

      expect(response.body).toEqual({
        msg: 'Application created successfully',
        data: {
          id: expect.any(Number),
          name: 'billing',
          description: 'Billing application',
        },
      });
    });

    it('persists the application in the database', async () => {
      const response = await send().expect(201);

      const row = await testApp.dataSource
        .getRepository(ApplicationEntity)
        .findOneByOrFail({ id: response.body.data.id });
      expect(row.name).toBe('billing');
      expect(row.description).toBe('Billing application');
      expect(await applicationCount()).toBe(2);
    });

    it('accepts a name of exactly 15 characters and a description of exactly 200', async () => {
      await send(
        adminAuthorization(),
        validBody({ name: 'a'.repeat(15), description: 'd'.repeat(200) }),
      ).expect(201);
    });

    it('ignores unknown properties instead of rejecting them (whitelist without forbidNonWhitelisted)', async () => {
      const response = await send(
        adminAuthorization(),
        validBody({ id: 999, extra: 'ignored' }),
      ).expect(201);

      expect(response.body.data).toEqual({
        id: expect.any(Number),
        name: 'billing',
        description: 'Billing application',
      });
      expect(response.body.data.id).not.toBe(999);
    });

    it('treats application names as case-sensitive (documents current behavior)', async () => {
      await send(adminAuthorization(), validBody({ name: 'IAM' })).expect(201);

      expect(await applicationCount()).toBe(2);
    });
  });

  describe('validation', () => {
    it('returns 400 when the body is empty', async () => {
      const response = await send(adminAuthorization(), {}).expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(response.body.error).toBe('Bad Request');
      expect(response.body.message).toEqual(
        expect.arrayContaining([
          'name must be a string',
          'description must be a string',
        ]),
      );
    });

    it('returns 400 when the name is not a string', async () => {
      const response = await send(
        adminAuthorization(),
        validBody({ name: 123 }),
      ).expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining(['name must be a string']),
      );
    });

    it('returns 400 when the name is longer than 15 characters', async () => {
      const response = await send(
        adminAuthorization(),
        validBody({ name: 'a'.repeat(16) }),
      ).expect(400);

      expect(response.body.message).toEqual([
        'name must be shorter than or equal to 15 characters',
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
        validBody({ name: 'a'.repeat(16) }),
      ).expect(400);

      expect(await applicationCount()).toBe(1);
    });
  });

  describe('conflicts', () => {
    it('returns 409 when an application with the same name already exists', async () => {
      await send().expect(201);

      const response = await send().expect(409);

      expect(response.body).toEqual({
        statusCode: 409,
        error: 'Conflict',
        message: 'An application with this name already exists',
      });
      expect(await applicationCount()).toBe(2);
    });

    it('returns 409 for the seeded iam application name', async () => {
      await send(adminAuthorization(), validBody({ name: 'iam' })).expect(409);
    });

    it('answers 500 with the generic message to the loser of a concurrent duplicate creation and persists a single row (documents current behavior)', async () => {
      // Both requests pass the findByName() check before either inserts; the
      // database unique constraint then rejects the second insert.
      const barrier = createBarrier(2);
      const original = ApplicationsRepository.prototype.findByName;
      const spy = jest
        .spyOn(ApplicationsRepository.prototype, 'findByName')
        .mockImplementation(async function (
          this: ApplicationsRepository,
          name: string,
        ) {
          await barrier.arrive();
          return original.call(this, name);
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
          .getRepository(ApplicationEntity)
          .findBy({ name: 'billing' });
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
