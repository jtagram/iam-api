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
import { AppTestApp, createAppTestApp } from '../helpers/app-test-app';
import { SeededIam, seedIamAdmin } from '../helpers/seed';
import {
  adminAuthorization,
  authorizationHeaderFor,
  authorizationHeaderForClaims,
  authorizationSignedByAnotherKey,
  expiredAuthorization,
} from '../helpers/test-auth';

describe('GET /internal-users/:id/applications (e2e)', () => {
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
  });

  afterAll(async () => {
    await testApp.close();
  });

  let userId: number;

  function send(
    authorization: string | null = adminAuthorization(),
    id: string | number = userId,
  ) {
    const req = testApp.http().get(`/internal-users/${id}/applications`);
    if (authorization) {
      req.set('Authorization', authorization);
    }
    return req;
  }

  it('returns 200 with an empty list when the user has no assignments', async () => {
    const response = await send().expect(200);

    expect(response.body).toEqual([]);
  });

  it('returns an assigned application with an empty role list', async () => {
    await grantInternalUserApplication(
      testApp.dataSource,
      userId,
      iam.iamApplication.id,
    );

    const response = await send().expect(200);

    expect(response.body).toEqual([
      {
        applicationId: iam.iamApplication.id,
        applicationName: 'iam',
        applicationDescription: 'Identity and access management',
        roles: [],
      },
    ]);
  });

  it('returns the roles assigned to the user inside their own application', async () => {
    await grantInternalUserApplication(
      testApp.dataSource,
      userId,
      iam.iamApplication.id,
    );
    await grantInternalUserRole(testApp.dataSource, userId, iam.adminRole);

    const response = await send().expect(200);

    expect(response.body).toEqual([
      {
        applicationId: iam.iamApplication.id,
        applicationName: 'iam',
        applicationDescription: 'Identity and access management',
        roles: [
          { id: iam.adminRole.id, name: 'ADMIN', description: 'Administrator' },
        ],
      },
    ]);
  });

  it('lists an application that was only reached through a role assignment', async () => {
    await grantInternalUserRole(testApp.dataSource, userId, iam.adminRole);

    const response = await send().expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].applicationId).toBe(iam.iamApplication.id);
    expect(response.body[0].roles).toHaveLength(1);
  });

  it('keeps the roles grouped under the application they belong to', async () => {
    const billing = await createApplication(
      testApp.dataSource,
      'billing',
      'Billing',
    );
    const payer = await createRole(testApp.dataSource, billing.id, 'PAYER');
    await grantInternalUserApplication(
      testApp.dataSource,
      userId,
      iam.iamApplication.id,
    );
    await grantInternalUserApplication(testApp.dataSource, userId, billing.id);
    await grantInternalUserRole(testApp.dataSource, userId, iam.adminRole);
    await grantInternalUserRole(testApp.dataSource, userId, payer);

    const response = await send().expect(200);

    const byName = Object.fromEntries(
      response.body.map(
        (entry: { applicationName: string; roles: { name: string }[] }) => [
          entry.applicationName,
          entry.roles.map((role) => role.name),
        ],
      ),
    );
    expect(byName).toEqual({ iam: ['ADMIN'], billing: ['PAYER'] });
  });

  it('does not include assignments of other users', async () => {
    const otherId = (
      await createInternalUser(testApp.dataSource, {
        email: 'other@example.com',
      })
    ).id;
    await grantInternalUserApplication(
      testApp.dataSource,
      otherId,
      iam.iamApplication.id,
    );

    const response = await send().expect(200);

    expect(response.body).toEqual([]);
  });

  describe('errors', () => {
    it('returns 404 when the user does not exist', async () => {
      const response = await send(adminAuthorization(), 999999).expect(404);

      expect(response.body).toEqual({
        statusCode: 404,
        error: 'Not Found',
        message: 'Internal user not found',
      });
    });

    it('returns 400 when the id is not numeric', async () => {
      const response = await send(adminAuthorization(), 'abc').expect(400);

      expect(response.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Validation failed (numeric string is expected)',
      });
    });

    it('returns 400 when the id is a decimal number', async () => {
      await send(adminAuthorization(), '1.5').expect(400);
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
