import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from '@jest/globals';
import {
  createAppUser,
  connectAppUser,
  createApplication,
  createRole,
  grantAppUserApplication,
  grantAppUserRole,
} from '../helpers/seed';
import { AppTestApp, createAppTestApp } from '../helpers/app-test-app';
import { SeededIam, seedIamAdmin } from '../helpers/seed';
import {
  adminAuthorization,
  authorizationHeaderFor,
  authorizationHeaderForClaims,
  authorizationSignedByAnotherKey,
  expiredAuthorization,
} from '../helpers/test-auth';

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

  function send(
    authorization: string | null = adminAuthorization(),
    id: string | number = userId,
  ) {
    const req = testApp.http().get(`/apps-users/${id}/connections`);
    if (authorization) {
      req.set('Authorization', authorization);
    }
    return req;
  }

  it('returns 200 with an empty list when the user has no connections', async () => {
    const response = await send().expect(200);

    expect(response.body).toEqual({
      msg: 'Connections retrieved successfully',
      data: [],
    });
  });

  it('returns the connections with the application names', async () => {
    const connection = await connectAppUser(
      testApp.dataSource,
      userId,
      iam.iamApplication.id,
      iam.iamApplication.id,
    );

    const response = await send().expect(200);

    expect(response.body).toEqual({
      msg: 'Connections retrieved successfully',
      data: [
        {
          id: connection.id,
          originApplicationId: iam.iamApplication.id,
          originApplicationName: 'iam',
          destinationApplicationId: iam.iamApplication.id,
          destinationApplicationName: 'iam',
        },
      ],
    });
  });

  it('returns several connections ordered by id, origin and destination kept apart', async () => {
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

    const response = await send().expect(200);

    expect(response.body.data).toEqual([
      {
        id: first.id,
        originApplicationId: iam.iamApplication.id,
        originApplicationName: 'iam',
        destinationApplicationId: billing.id,
        destinationApplicationName: 'billing',
      },
      {
        id: second.id,
        originApplicationId: billing.id,
        originApplicationName: 'billing',
        destinationApplicationId: iam.iamApplication.id,
        destinationApplicationName: 'iam',
      },
    ]);
  });

  it('does not include connections of other users', async () => {
    const otherId = (
      await createAppUser(testApp.dataSource, { clienteId: 'other-client' })
    ).entity.id;
    await connectAppUser(
      testApp.dataSource,
      otherId,
      iam.iamApplication.id,
      iam.iamApplication.id,
    );

    const response = await send().expect(200);

    expect(response.body.data).toEqual([]);
  });

  describe('errors', () => {
    it('returns 404 when the user does not exist', async () => {
      const response = await send(adminAuthorization(), 999999).expect(404);

      expect(response.body).toEqual({
        statusCode: 404,
        error: 'Not Found',
        message: 'Application user not found',
      });
    });

    it('returns 400 when the id is not numeric', async () => {
      const response = await send(adminAuthorization(), 'abc').expect(400);

      expect(response.body.message).toBe(
        'Validation failed (numeric string is expected)',
      );
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
