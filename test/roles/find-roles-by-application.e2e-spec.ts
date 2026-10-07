import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from '@jest/globals';
import { ApplicationEntity } from '../../src/common/database/application/application.entity';
import { RoleEntity } from '../../src/common/database/role/role.entity';
import { createApplication, createRole } from '../helpers/seed';
import { AppTestApp, createAppTestApp } from '../helpers/app-test-app';
import { SeededIam, seedIamAdmin } from '../helpers/seed';
import {
  adminAuthorization,
  authorizationHeaderFor,
  authorizationHeaderForClaims,
  authorizationSignedByAnotherKey,
  expiredAuthorization,
} from '../helpers/test-auth';

describe('GET /roles (e2e)', () => {
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

  function send(
    authorization: string | null = adminAuthorization(),
    query: Record<string, string> = {
      applicationId: String(iam.iamApplication.id),
    },
  ) {
    const req = testApp.http().get('/roles').query(query);
    if (authorization) {
      req.set('Authorization', authorization);
    }
    return req;
  }

  it('returns 200 with the roles of the application in the {msg, data} envelope', async () => {
    const response = await send().expect(200);

    expect(response.body).toEqual({
      msg: 'Roles retrieved successfully',
      data: [
        {
          id: iam.adminRole.id,
          applicationId: iam.iamApplication.id,
          name: 'ADMIN',
          description: 'Administrator',
        },
      ],
    });
  });

  it('returns only the roles of the requested application', async () => {
    const billing = await createApplication(testApp.dataSource, 'billing');
    const editor = await createRole(
      testApp.dataSource,
      iam.iamApplication.id,
      'EDITOR',
    );
    await createRole(testApp.dataSource, billing.id, 'PAYER');

    const response = await send().expect(200);

    expect(
      response.body.data.map((role: { name: string }) => role.name).sort(),
    ).toEqual(['ADMIN', 'EDITOR']);
    expect(response.body.data).toContainEqual({
      id: editor.id,
      applicationId: iam.iamApplication.id,
      name: 'EDITOR',
      description: 'EDITOR description',
    });
  });

  it('returns an empty list for an application without roles', async () => {
    const billing = await createApplication(testApp.dataSource, 'billing');

    const response = await send(adminAuthorization(), {
      applicationId: String(billing.id),
    }).expect(200);

    expect(response.body).toEqual({
      msg: 'Roles retrieved successfully',
      data: [],
    });
  });

  it('ignores unknown query parameters (whitelist without forbidNonWhitelisted)', async () => {
    await send(adminAuthorization(), {
      applicationId: String(iam.iamApplication.id),
      other: 'x',
    }).expect(200);
  });

  describe('validation', () => {
    it('returns 400 when applicationId is missing', async () => {
      const response = await send(adminAuthorization(), {}).expect(400);

      expect(response.body.message).toEqual([
        'applicationId must be an integer number',
      ]);
    });

    it('returns 400 when applicationId is not numeric', async () => {
      const response = await send(adminAuthorization(), {
        applicationId: 'abc',
      }).expect(400);

      expect(response.body.message).toEqual([
        'applicationId must be an integer number',
      ]);
    });

    it('returns 400 when applicationId is a decimal number', async () => {
      await send(adminAuthorization(), { applicationId: '1.5' }).expect(400);
    });
  });

  it('returns 404 when the application does not exist', async () => {
    const response = await send(adminAuthorization(), {
      applicationId: '999999',
    }).expect(404);

    expect(response.body).toEqual({
      statusCode: 404,
      error: 'Not Found',
      message: 'Application not found',
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
