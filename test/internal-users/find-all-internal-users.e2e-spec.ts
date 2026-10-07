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
import { InternalUserEntity } from '../../src/common/database/internal-user/internal-user.entity';
import { AppTestApp, createAppTestApp } from '../helpers/app-test-app';
import { SeededIam, seedIamAdmin } from '../helpers/seed';
import {
  adminAuthorization,
  authorizationHeaderFor,
  authorizationHeaderForClaims,
  authorizationSignedByAnotherKey,
  expiredAuthorization,
} from '../helpers/test-auth';

describe('GET /internal-users (e2e)', () => {
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
    const req = testApp.http().get('/internal-users');
    if (authorization) {
      req.set('Authorization', authorization);
    }
    return req;
  }

  it('returns 200 with the internal users as a bare array', async () => {
    const response = await send().expect(200);

    expect(response.body).toEqual([
      {
        id: iam.adminUser.id,
        name: 'Admin',
        lastname: 'Istrator',
        email: 'admin@example.com',
      },
    ]);
  });

  it('returns every internal user', async () => {
    await createInternalUser(testApp.dataSource, { email: 'a@example.com' });
    await createInternalUser(testApp.dataSource, { email: 'b@example.com' });

    const response = await send().expect(200);

    expect(response.body.map((u: { email: string }) => u.email).sort()).toEqual(
      ['a@example.com', 'admin@example.com', 'b@example.com'],
    );
  });

  it('never exposes the stored password hash', async () => {
    const response = await send().expect(200);

    expect(Object.keys(response.body[0]).sort()).toEqual([
      'email',
      'id',
      'lastname',
      'name',
    ]);
    expect(JSON.stringify(response.body)).not.toContain('$2');
  });

  it('returns an empty array when there are no internal users', async () => {
    await testApp.dataSource.getRepository(InternalUserEntity).clear();

    const response = await send().expect(200);

    expect(response.body).toEqual([]);
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
