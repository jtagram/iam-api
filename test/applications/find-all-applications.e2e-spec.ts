import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from '@jest/globals';
import { ApplicationEntity } from '../../src/common/database/application/application.entity';
import { createApplication } from '../helpers/seed';
import { AppTestApp, createAppTestApp } from '../helpers/app-test-app';
import { SeededIam, seedIamAdmin } from '../helpers/seed';
import {
  adminAuthorization,
  authorizationHeaderFor,
  authorizationHeaderForClaims,
  authorizationSignedByAnotherKey,
  expiredAuthorization,
} from '../helpers/test-auth';

describe('GET /applications (e2e)', () => {
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
    const req = testApp.http().get('/applications');
    if (authorization) {
      req.set('Authorization', authorization);
    }
    return req;
  }

  it('returns 200 with the seeded application in the {msg, data} envelope', async () => {
    const response = await send().expect(200);

    expect(response.body).toEqual({
      msg: 'Applications retrieved successfully',
      data: [
        {
          id: iam.iamApplication.id,
          name: 'iam',
          description: 'Identity and access management',
        },
      ],
    });
  });

  it('returns every stored application with exactly id, name and description', async () => {
    const billing = await createApplication(
      testApp.dataSource,
      'billing',
      'Billing',
    );
    const hub = await createApplication(
      testApp.dataSource,
      'ticket-hub',
      'Tickets',
    );

    const response = await send().expect(200);

    expect(response.body.msg).toBe('Applications retrieved successfully');
    expect(response.body.data).toHaveLength(3);
    expect(response.body.data).toEqual(
      expect.arrayContaining([
        {
          id: iam.iamApplication.id,
          name: 'iam',
          description: 'Identity and access management',
        },
        { id: billing.id, name: 'billing', description: 'Billing' },
        { id: hub.id, name: 'ticket-hub', description: 'Tickets' },
      ]),
    );
  });

  it('returns an empty list when there are no applications', async () => {
    await testApp.dataSource.getRepository(ApplicationEntity).clear();

    const response = await send().expect(200);

    expect(response.body).toEqual({
      msg: 'Applications retrieved successfully',
      data: [],
    });
  });

  it('does not modify the stored applications', async () => {
    await send().expect(200);

    expect(
      await testApp.dataSource.getRepository(ApplicationEntity).count(),
    ).toBe(1);
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
