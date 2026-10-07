import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from '@jest/globals';
import {
  createApplication,
  createInternalUser,
  createRole,
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

describe('GET /internal-users/by-role (e2e)', () => {
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

  let billingId: number;
  let editor: Awaited<ReturnType<typeof createRole>>;
  let payer: Awaited<ReturnType<typeof createRole>>;
  let aliceId: number;
  let bobId: number;

  function send(
    authorization: string | null = adminAuthorization(),
    query: Record<string, string> = { applicationName: 'iam', roles: 'ADMIN' },
  ) {
    const req = testApp.http().get('/internal-users/by-role').query(query);
    if (authorization) {
      req.set('Authorization', authorization);
    }
    return req;
  }

  function emails(body: { email: string }[]) {
    return body.map((user) => user.email).sort();
  }

  // admin@example.com: ADMIN (iam) | alice: EDITOR (iam) | bob: ADMIN + EDITOR (iam)
  // carol: PAYER (billing), also a role named ADMIN in billing
  beforeEach(async () => {
    const ds = testApp.dataSource;
    const billing = await createApplication(ds, 'billing');
    billingId = billing.id;
    editor = await createRole(ds, iam.iamApplication.id, 'EDITOR');
    payer = await createRole(ds, billingId, 'PAYER');
    const billingAdmin = await createRole(ds, billingId, 'ADMIN');
    const alice = await createInternalUser(ds, {
      email: 'alice@example.com',
      name: 'Alice',
    });
    const bob = await createInternalUser(ds, {
      email: 'bob@example.com',
      name: 'Bob',
    });
    const carol = await createInternalUser(ds, {
      email: 'carol@example.com',
      name: 'Carol',
    });
    aliceId = alice.id;
    bobId = bob.id;
    await grantInternalUserRole(ds, alice.id, editor);
    await grantInternalUserRole(ds, bob.id, iam.adminRole);
    await grantInternalUserRole(ds, bob.id, editor);
    await grantInternalUserRole(ds, carol.id, payer);
    await grantInternalUserRole(ds, carol.id, billingAdmin);
  });

  describe('search', () => {
    it('returns 200 with a bare array of the users holding the role in the application', async () => {
      const response = await send().expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body).toContainEqual({
        id: iam.adminUser.id,
        name: 'Admin',
        lastname: 'Istrator',
        email: 'admin@example.com',
      });
      expect(response.body).toContainEqual({
        id: bobId,
        name: 'Bob',
        lastname: 'Lastname',
        email: 'bob@example.com',
      });
    });

    it('returns the users holding any of several comma-separated roles, each user once', async () => {
      const response = await send(adminAuthorization(), {
        applicationName: 'iam',
        roles: 'ADMIN,EDITOR',
      }).expect(200);

      expect(emails(response.body)).toEqual([
        'admin@example.com',
        'alice@example.com',
        'bob@example.com',
      ]);
    });

    it('trims spaces around the role names and ignores empty entries', async () => {
      const response = await send(adminAuthorization(), {
        applicationName: 'iam',
        roles: ' EDITOR , ,',
      }).expect(200);

      expect(emails(response.body)).toEqual([
        'alice@example.com',
        'bob@example.com',
      ]);
    });

    it('only matches roles of the requested application', async () => {
      const response = await send(adminAuthorization(), {
        applicationName: 'billing',
        roles: 'ADMIN',
      }).expect(200);

      expect(emails(response.body)).toEqual(['carol@example.com']);
    });

    it('returns an empty array when no role matches', async () => {
      const response = await send(adminAuthorization(), {
        applicationName: 'iam',
        roles: 'UNKNOWN',
      }).expect(200);

      expect(response.body).toEqual([]);
    });

    it('returns an empty array when the roles list only has separators', async () => {
      const response = await send(adminAuthorization(), {
        applicationName: 'iam',
        roles: ',',
      }).expect(200);

      expect(response.body).toEqual([]);
    });

    it('does not mix the route up with /internal-users/:id/applications', async () => {
      const response = await send().expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('never exposes the stored password hash', async () => {
      const response = await send().expect(200);

      expect(JSON.stringify(response.body)).not.toContain('$2');
      expect(Object.keys(response.body[0]).sort()).toEqual([
        'email',
        'id',
        'lastname',
        'name',
      ]);
    });
  });

  describe('validation', () => {
    it('returns 400 when applicationName is missing', async () => {
      const response = await send(adminAuthorization(), {
        roles: 'ADMIN',
      }).expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining(['applicationName should not be empty']),
      );
    });

    it('returns 400 when roles is missing', async () => {
      const response = await send(adminAuthorization(), {
        applicationName: 'iam',
      }).expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining(['roles should not be empty']),
      );
    });

    it('returns 400 when applicationName is longer than 15 characters', async () => {
      const response = await send(adminAuthorization(), {
        applicationName: 'a'.repeat(16),
        roles: 'ADMIN',
      }).expect(400);

      expect(response.body.message).toEqual([
        'applicationName must be shorter than or equal to 15 characters',
      ]);
    });

    it('returns 400 when roles is empty', async () => {
      await send(adminAuthorization(), {
        applicationName: 'iam',
        roles: '',
      }).expect(400);
    });
  });

  it('returns 404 when the application does not exist', async () => {
    const response = await send(adminAuthorization(), {
      applicationName: 'missing',
      roles: 'ADMIN',
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
