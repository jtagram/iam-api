import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from '@jest/globals';
import {
  createInternalUser,
  connectInternalUser,
  createApplication,
  createRole,
  grantInternalUserApplication,
  grantInternalUserRole,
} from '../helpers/seed';
import { InternalUserAppEntity } from '../../src/common/database/internal-user/internal-user-app.entity';
import { AppTestApp, createAppTestApp } from '../helpers/app-test-app';
import { SeededIam, seedIamAdmin } from '../helpers/seed';
import {
  adminAuthorization,
  authorizationHeaderFor,
  authorizationHeaderForClaims,
  authorizationSignedByAnotherKey,
  expiredAuthorization,
} from '../helpers/test-auth';

describe('POST /internal-users/:id/applications (e2e)', () => {
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
    baseline = await testApp.dataSource
      .getRepository(InternalUserAppEntity)
      .count();
  });

  afterAll(async () => {
    await testApp.close();
  });

  let userId: number;

  function validBody(overrides: Record<string, unknown> = {}) {
    return { applicationId: iam.iamApplication.id, ...overrides };
  }

  function send(
    authorization: string | null = adminAuthorization(),
    body: object = validBody(),
    id: string | number = userId,
  ) {
    const req = testApp.http().post(`/internal-users/${id}/applications`);
    if (authorization) {
      req.set('Authorization', authorization);
    }
    return req.send(body);
  }

  let baseline = 0;

  // Rows created by the test only: seedIamAdmin may already insert assignments.
  async function assignmentCount() {
    return (
      (await testApp.dataSource.getRepository(InternalUserAppEntity).count()) -
      baseline
    );
  }

  describe('assignment', () => {
    it('returns 201 with the created assignment', async () => {
      const response = await send().expect(201);

      expect(response.body).toEqual({
        id: expect.any(Number),
        internalUserId: userId,
        applicationId: iam.iamApplication.id,
      });
    });

    it('persists the assignment in the database', async () => {
      const response = await send().expect(201);

      const row = await testApp.dataSource
        .getRepository(InternalUserAppEntity)
        .findOneByOrFail({ id: response.body.id });
      expect(row.internalUserId).toBe(userId);
      expect(row.applicationId).toBe(iam.iamApplication.id);
    });

    it('ignores unknown properties (whitelist)', async () => {
      await send(
        adminAuthorization(),
        validBody({ id: 999, extra: 'x' }),
      ).expect(201);
    });
  });

  describe('validation', () => {
    it('returns 400 when applicationId is missing', async () => {
      const response = await send(adminAuthorization(), {}).expect(400);

      expect(response.body.message).toEqual([
        'applicationId must be an integer number',
      ]);
    });

    it('returns 400 when applicationId is a numeric string', async () => {
      const response = await send(
        adminAuthorization(),
        validBody({ applicationId: '1' }),
      ).expect(400);

      expect(response.body.message).toEqual([
        'applicationId must be an integer number',
      ]);
    });

    it('returns 400 when applicationId is a decimal number', async () => {
      await send(
        adminAuthorization(),
        validBody({ applicationId: 1.5 }),
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

    it('does not persist anything when validation fails', async () => {
      await send(adminAuthorization(), {}).expect(400);

      expect(await assignmentCount()).toBe(0);
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
        message: 'Internal user not found',
      });
      expect(await assignmentCount()).toBe(0);
    });

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
      expect(await assignmentCount()).toBe(0);
    });
  });

  describe('conflicts', () => {
    it('returns 409 when the application is already assigned to the user', async () => {
      await send().expect(201);

      const response = await send().expect(409);

      expect(response.body).toEqual({
        statusCode: 409,
        error: 'Conflict',
        message: 'Application already assigned to this user',
      });
      expect(await assignmentCount()).toBe(1);
    });

    it('allows the same application to be assigned to a different user', async () => {
      await send().expect(201);
      const otherId = (
        await createInternalUser(testApp.dataSource, {
          email: 'other@example.com',
        })
      ).id;

      await send(adminAuthorization(), validBody(), otherId).expect(201);

      expect(await assignmentCount()).toBe(2);
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
