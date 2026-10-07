import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import {
  createAppUser,
  connectAppUser,
  createApplication,
  createRole,
  grantAppUserApplication,
  grantAppUserRole,
} from '../helpers/seed';
import { AppUserConnectionEntity } from '../../src/common/database/app-user-connection/app-user-connection.entity';
import { AppUserConnectionsRepository } from '../../src/common/database/app-user-connection/app-user-connections.repository';
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

describe('POST /apps-users/:id/connections (e2e)', () => {
  let testApp: AppTestApp;
  let iam: SeededIam;

  beforeAll(async () => {
    testApp = await createAppTestApp();
  });

  beforeEach(async () => {
    await testApp.resetTables();
    iam = await seedIamAdmin(testApp.dataSource);
    userId = (await createAppUser(testApp.dataSource)).entity.id;
    const billing = await createApplication(testApp.dataSource, 'billing');
    billingId = billing.id;
    await grantAppUserApplication(
      testApp.dataSource,
      userId,
      iam.iamApplication.id,
    );
    await grantAppUserApplication(testApp.dataSource, userId, billingId);
    baseline = await testApp.dataSource
      .getRepository(AppUserConnectionEntity)
      .count();
  });

  afterAll(async () => {
    await testApp.close();
  });

  let userId: number;
  let billingId: number;
  let baseline = 0;

  function validBody(overrides: Record<string, unknown> = {}) {
    return {
      originApplicationId: iam.iamApplication.id,
      destinationApplicationId: billingId,
      ...overrides,
    };
  }

  function send(
    authorization: string | null = adminAuthorization(),
    body: object = validBody(),
    id: string | number = userId,
  ) {
    const req = testApp.http().post(`/apps-users/${id}/connections`);
    if (authorization) {
      req.set('Authorization', authorization);
    }
    return req.send(body);
  }

  // Rows created by the test only: seedIamAdmin may already insert connections.
  async function connectionCount() {
    return (
      (await testApp.dataSource
        .getRepository(AppUserConnectionEntity)
        .count()) - baseline
    );
  }

  describe('creation', () => {
    it('returns 201 with the created connection and the application names', async () => {
      const response = await send().expect(201);

      expect(response.body).toEqual({
        msg: 'Connection created successfully',
        data: {
          id: expect.any(Number),
          originApplicationId: iam.iamApplication.id,
          originApplicationName: 'iam',
          destinationApplicationId: billingId,
          destinationApplicationName: 'billing',
        },
      });
    });

    it('persists the connection in the database', async () => {
      const response = await send().expect(201);

      const row = await testApp.dataSource
        .getRepository(AppUserConnectionEntity)
        .findOneByOrFail({ id: response.body.data.id });
      expect(row.appUserId).toBe(userId);
      expect(row.originApplicationId).toBe(iam.iamApplication.id);
      expect(row.destinationApplicationId).toBe(billingId);
    });

    it('treats the reverse direction as a different connection', async () => {
      await send().expect(201);

      await send(
        adminAuthorization(),
        validBody({
          originApplicationId: billingId,
          destinationApplicationId: iam.iamApplication.id,
        }),
      ).expect(201);

      expect(await connectionCount()).toBe(2);
    });

    it('allows several destinations for the same origin', async () => {
      const hub = await createApplication(testApp.dataSource, 'ticket-hub');
      await grantAppUserApplication(testApp.dataSource, userId, hub.id);
      await send().expect(201);

      await send(
        adminAuthorization(),
        validBody({ destinationApplicationId: hub.id }),
      ).expect(201);

      expect(await connectionCount()).toBe(2);
    });
  });

  describe('validation', () => {
    it('returns 400 when the body is empty', async () => {
      const response = await send(adminAuthorization(), {}).expect(400);

      expect(response.body.message).toEqual([
        'originApplicationId must be an integer number',
        'destinationApplicationId must be an integer number',
      ]);
    });

    it('returns 400 when an application id is a numeric string', async () => {
      await send(
        adminAuthorization(),
        validBody({ originApplicationId: '1' }),
      ).expect(400);
    });

    it('returns 400 when the user id is not numeric', async () => {
      const response = await send(
        adminAuthorization(),
        validBody(),
        'abc',
      ).expect(400);

      expect(response.body.message).toBe(
        'Validation failed (numeric string is expected)',
      );
    });

    it('returns 400 when origin and destination are the same application', async () => {
      const response = await send(
        adminAuthorization(),
        validBody({ destinationApplicationId: iam.iamApplication.id }),
      ).expect(400);

      expect(response.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Origin and destination applications must be different',
      });
      expect(await connectionCount()).toBe(0);
    });

    it('returns 400 when the origin application is not assigned to the user', async () => {
      const hub = await createApplication(testApp.dataSource, 'ticket-hub');

      const response = await send(
        adminAuthorization(),
        validBody({ originApplicationId: hub.id }),
      ).expect(400);

      expect(response.body.message).toBe(
        'The user does not have this application assigned',
      );
      expect(await connectionCount()).toBe(0);
    });

    it('returns 400 when the destination application is not assigned to the user', async () => {
      const hub = await createApplication(testApp.dataSource, 'ticket-hub');

      const response = await send(
        adminAuthorization(),
        validBody({ destinationApplicationId: hub.id }),
      ).expect(400);

      expect(response.body.message).toBe(
        'The user does not have this application assigned',
      );
      expect(await connectionCount()).toBe(0);
    });
  });

  describe('not found', () => {
    it('returns 404 when the user does not exist', async () => {
      const response = await send(
        adminAuthorization(),
        validBody(),
        999999,
      ).expect(404);

      expect(response.body).toEqual({
        statusCode: 404,
        error: 'Not Found',
        message: 'Application user not found',
      });
    });

    it('checks the user before the same-application rule', async () => {
      await send(
        adminAuthorization(),
        validBody({ destinationApplicationId: iam.iamApplication.id }),
        999999,
      ).expect(404);
    });

    it('returns 404 when the origin application does not exist', async () => {
      const response = await send(
        adminAuthorization(),
        validBody({ originApplicationId: 999999 }),
      ).expect(404);

      expect(response.body).toEqual({
        statusCode: 404,
        error: 'Not Found',
        message: 'Application not found',
      });
    });

    it('returns 404 when the destination application does not exist', async () => {
      await send(
        adminAuthorization(),
        validBody({ destinationApplicationId: 999999 }),
      ).expect(404);

      expect(await connectionCount()).toBe(0);
    });
  });

  describe('conflicts', () => {
    it('returns 409 when the connection already exists for the user', async () => {
      await send().expect(201);

      const response = await send().expect(409);

      expect(response.body).toEqual({
        statusCode: 409,
        error: 'Conflict',
        message: 'This connection already exists for the user',
      });
      expect(await connectionCount()).toBe(1);
    });

    it('allows the same connection for a different user', async () => {
      await send().expect(201);
      const otherId = (
        await createAppUser(testApp.dataSource, { clienteId: 'other-client' })
      ).entity.id;
      await grantAppUserApplication(
        testApp.dataSource,
        otherId,
        iam.iamApplication.id,
      );
      await grantAppUserApplication(testApp.dataSource, otherId, billingId);

      await send(adminAuthorization(), validBody(), otherId).expect(201);

      expect(await connectionCount()).toBe(2);
    });

    it('creates two identical rows when the same connection is requested concurrently, because nothing enforces uniqueness in the database (documents current behavior)', async () => {
      const barrier = createBarrier(2);
      const original =
        AppUserConnectionsRepository.prototype.existsForAppUserAndApplications;
      const spy = jest
        .spyOn(
          AppUserConnectionsRepository.prototype,
          'existsForAppUserAndApplications',
        )
        .mockImplementation(async function (
          this: AppUserConnectionsRepository,
          ...args: Parameters<
            AppUserConnectionsRepository['existsForAppUserAndApplications']
          >
        ) {
          await barrier.arrive();
          return original.apply(this, args);
        });

      try {
        const [first, second] = await Promise.all([send(), send()]);

        expect([first.status, second.status]).toEqual([201, 201]);
        expect(await connectionCount()).toBe(2);
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
