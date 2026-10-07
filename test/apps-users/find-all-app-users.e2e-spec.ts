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

describe('GET /apps-users (e2e)', () => {
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
    const req = testApp.http().get('/apps-users');
    if (authorization) {
      req.set('Authorization', authorization);
    }
    return req;
  }

  it('returns 200 with the stored application users in the {msg, data} envelope', async () => {
    const first = await createAppUser(testApp.dataSource, {
      clienteId: 'client-a',
      name: 'Alpha',
      description: 'First',
    });

    const response = await send().expect(200);

    expect(response.body).toEqual({
      msg: 'Application users retrieved successfully',
      data: [
        {
          id: first.entity.id,
          clienteId: 'client-a',
          name: 'Alpha',
          description: 'First',
        },
      ],
    });
  });

  it('returns every application user', async () => {
    await createAppUser(testApp.dataSource, { clienteId: 'client-a' });
    await createAppUser(testApp.dataSource, { clienteId: 'client-b' });

    const response = await send().expect(200);

    expect(
      response.body.data.map((u: { clienteId: string }) => u.clienteId).sort(),
    ).toEqual(['client-a', 'client-b']);
  });

  it('never exposes the stored secret hash', async () => {
    await createAppUser(testApp.dataSource, { clienteId: 'client-a' });

    const response = await send().expect(200);

    expect(Object.keys(response.body.data[0]).sort()).toEqual([
      'clienteId',
      'description',
      'id',
      'name',
    ]);
    expect(JSON.stringify(response.body)).not.toContain('$2');
  });

  it('returns an empty list when there are no application users', async () => {
    const response = await send().expect(200);

    expect(response.body).toEqual({
      msg: 'Application users retrieved successfully',
      data: [],
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
