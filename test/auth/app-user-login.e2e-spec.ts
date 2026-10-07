import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from '@jest/globals';
import {
  connectAppUser,
  createApplication,
  createAppUser,
  createRole,
  grantAppUserApplication,
  grantAppUserRole,
} from '../helpers/seed';
import { TEST_JWT_EXPIRES_IN_SECONDS } from '../helpers/app-test-app';
import { verifyWithPublishedKey } from '../helpers/jwks';
import { AppUserEntity } from '../../src/common/database/app-user/app-user.entity';
import { AppTestApp, createAppTestApp } from '../helpers/app-test-app';
import { SeededIam, seedIamAdmin } from '../helpers/seed';
import {
  adminAuthorization,
  authorizationHeaderFor,
  authorizationHeaderForClaims,
  authorizationSignedByAnotherKey,
  expiredAuthorization,
} from '../helpers/test-auth';

describe('POST /apps-users/login (e2e)', () => {
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
  let appUserId: number;
  let payer: Awaited<ReturnType<typeof createRole>>;
  let reader: Awaited<ReturnType<typeof createRole>>;

  const CREDENTIALS = {
    clienteId: 'client-a',
    clienteSecret: 'client-secret-1',
  };
  const WRONG_CREDENTIALS = {
    clienteId: 'client-a',
    clienteSecret: 'wrong-secret',
  };
  const UNKNOWN_CREDENTIALS = {
    clienteId: 'nobody',
    clienteSecret: 'client-secret-1',
  };

  beforeEach(async () => {
    const ds = testApp.dataSource;
    const billing = await createApplication(
      ds,
      'billing',
      'Billing application',
    );
    billingId = billing.id;
    payer = await createRole(ds, billing.id, 'PAYER', 'Can pay');
    reader = await createRole(ds, billing.id, 'READER', 'Can read');
    const user = await createAppUser(ds, {
      clienteId: 'client-a',
      clienteSecret: 'client-secret-1',
    });
    appUserId = user.entity.id;
    // fully configured access: iam -> billing with the PAYER role
    await grantAppUserApplication(ds, appUserId, iam.iamApplication.id);
    await grantAppUserApplication(ds, appUserId, billing.id);
    await connectAppUser(ds, appUserId, iam.iamApplication.id, billing.id);
    await grantAppUserRole(ds, appUserId, payer);
  });

  interface Headers {
    origin?: string | null;
    target?: string | null;
  }

  function send(body: object = CREDENTIALS, headers: Headers = {}) {
    const req = testApp.http().post('/apps-users/login');
    const origin = headers.origin === undefined ? 'iam' : headers.origin;
    const target = headers.target === undefined ? 'billing' : headers.target;
    if (origin !== null) {
      req.set('x-application-name', origin);
    }
    if (target !== null) {
      req.set('x-target-application', target);
    }
    return req.send(body);
  }

  describe('success', () => {
    it('returns 200 with only an access_token', async () => {
      const response = await send().expect(200);

      expect(Object.keys(response.body)).toEqual(['access_token']);
      expect(response.body.access_token.split('.')).toHaveLength(3);
    });

    it('needs no Authorization header and ignores an invalid one (public route)', async () => {
      await send().set('Authorization', 'Bearer garbage').expect(200);
    });

    it('signs the token with RS256 and the published key id, and it verifies against the JWKS key', async () => {
      const response = await send().expect(200);

      const verified = await verifyWithPublishedKey(
        testApp,
        response.body.access_token,
      );
      expect(verified.header.alg).toBe('RS256');
      expect(verified.header.kid).toBe('iam-api-rsa-1');
    });

    it('puts the user, the origin and the target application with its roles in the token', async () => {
      const response = await send().expect(200);

      const { payload } = await verifyWithPublishedKey(
        testApp,
        response.body.access_token,
      );
      expect(payload).toEqual({
        sub: appUserId,
        clienteId: 'client-a',
        origin: 'iam',
        apps: {
          application: {
            id: billingId,
            name: 'billing',
            description: 'Billing application',
            roles: [{ id: payer.id, name: 'PAYER', description: 'Can pay' }],
          },
        },
        iat: expect.any(Number),
        exp: expect.any(Number),
      });
    });

    it('never puts the secret or the password hash in the token', async () => {
      const response = await send().expect(200);

      const { payload } = await verifyWithPublishedKey(
        testApp,
        response.body.access_token,
      );
      expect(JSON.stringify(payload)).not.toContain('$2');
      expect(payload).not.toHaveProperty('password');
      expect(payload).not.toHaveProperty('clienteSecret');
    });

    it('expires the token after JWT_EXPIRES_IN (15 minutes)', async () => {
      const before = Math.floor(Date.now() / 1000);

      const response = await send().expect(200);

      const { payload } = await verifyWithPublishedKey(
        testApp,
        response.body.access_token,
      );
      expect(payload.exp - payload.iat).toBe(TEST_JWT_EXPIRES_IN_SECONDS);
      expect(payload.iat).toBeGreaterThanOrEqual(before - 1);
    });

    it('includes every role the user has in the target application and none from other applications', async () => {
      await grantAppUserRole(testApp.dataSource, appUserId, reader);
      await grantAppUserRole(testApp.dataSource, appUserId, iam.adminRole);

      const response = await send().expect(200);

      const { payload } = await verifyWithPublishedKey(
        testApp,
        response.body.access_token,
      );
      expect(
        payload.apps.application.roles
          .map((role: { name: string }) => role.name)
          .sort(),
      ).toEqual(['PAYER', 'READER']);
    });

    it('trims the application headers', async () => {
      await send(CREDENTIALS, { origin: ' iam ', target: ' billing ' }).expect(
        200,
      );
    });

    it('keeps working for a token whose target application is not iam, but that token is rejected by the admin endpoints', async () => {
      const response = await send().expect(200);

      const admin = await testApp
        .http()
        .get('/applications')
        .set('Authorization', `Bearer ${response.body.access_token}`)
        .expect(403);
      expect(admin.body.message).toBe(
        'This token was not issued for the iam application',
      );
    });

    it('issues a token that is accepted by the admin endpoints when the target is iam and the user has the ADMIN role', async () => {
      await connectAppUser(
        testApp.dataSource,
        appUserId,
        iam.iamApplication.id,
        iam.iamApplication.id,
      );
      await grantAppUserRole(testApp.dataSource, appUserId, iam.adminRole);

      const login = await send(CREDENTIALS, { target: 'iam' }).expect(200);
      const response = await testApp
        .http()
        .get('/applications')
        .set('Authorization', `Bearer ${login.body.access_token}`)
        .expect(200);

      expect(response.body.msg).toBe('Applications retrieved successfully');
    });

    it('accepts the credentials returned by POST /apps-users', async () => {
      const created = await testApp
        .http()
        .post('/apps-users')
        .set('Authorization', adminAuthorization())
        .send({ name: 'Generated', description: 'Generated user' })
        .expect(201);
      const { id, clienteId, clienteSecret } = created.body.data;
      await grantAppUserApplication(
        testApp.dataSource,
        id,
        iam.iamApplication.id,
      );
      await grantAppUserApplication(testApp.dataSource, id, billingId);
      await connectAppUser(
        testApp.dataSource,
        id,
        iam.iamApplication.id,
        billingId,
      );
      await grantAppUserRole(testApp.dataSource, id, payer);

      const response = await send({ clienteId, clienteSecret }).expect(200);

      expect(response.body.access_token).toEqual(expect.any(String));
    });

    it('rejects the stored bcrypt hash used as the secret', async () => {
      const row = await testApp.dataSource
        .getRepository(AppUserEntity)
        .findOneByOrFail({ id: appUserId });

      await send({
        clienteId: 'client-a',
        clienteSecret: row.clienteSecret,
      }).expect(401);
    });
  });

  describe('invalid credentials', () => {
    it('returns 401 Invalid credentials for a wrong secret', async () => {
      const response = await send(WRONG_CREDENTIALS).expect(401);

      expect(response.body).toEqual({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid credentials',
      });
    });

    it('returns 401 Invalid credentials for an unknown user', async () => {
      const response = await send(UNKNOWN_CREDENTIALS).expect(401);

      expect(response.body).toEqual({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid credentials',
      });
    });

    it('answers an unknown user and a wrong secret with the same body, so the user existence is not revealed', async () => {
      const unknown = await send(UNKNOWN_CREDENTIALS).expect(401);
      const wrong = await send(WRONG_CREDENTIALS).expect(401);

      expect(unknown.body).toEqual(wrong.body);
    });

    it('checks the credentials before the application headers are resolved (unknown applications do not mask a wrong secret)', async () => {
      const response = await send(WRONG_CREDENTIALS, {
        origin: 'nope',
        target: 'nope',
      }).expect(401);

      expect(response.body.message).toBe('Invalid credentials');
    });

    it('does not issue a token for a wrong secret', async () => {
      const response = await send(WRONG_CREDENTIALS).expect(401);

      expect(response.body).not.toHaveProperty('access_token');
    });
  });

  describe('validation', () => {
    it('returns 400 when clienteId is missing', async () => {
      const response = await send({ clienteSecret: 'client-secret-1' }).expect(
        400,
      );

      expect(response.body.message).toEqual(
        expect.arrayContaining(['clienteId must be a string']),
      );
    });

    it('returns 400 when clienteSecret is empty', async () => {
      const response = await send({
        clienteId: 'client-a',
        clienteSecret: '',
      }).expect(400);

      expect(response.body.message).toEqual([
        'clienteSecret should not be empty',
      ]);
    });

    it('returns 400 when clienteId is longer than 15 characters', async () => {
      const response = await send({
        clienteId: 'c'.repeat(16),
        clienteSecret: 'client-secret-1',
      }).expect(400);

      expect(response.body.message).toEqual([
        'clienteId must be shorter than or equal to 15 characters',
      ]);
    });

    it('returns 400 when the body is empty', async () => {
      await send({}).expect(400);
    });

    it('returns 400 when x-application-name is missing', async () => {
      const response = await send(CREDENTIALS, { origin: null }).expect(400);

      expect(response.body.message).toBe(
        'x-application-name header is required',
      );
    });

    it('returns 400 when x-target-application is missing', async () => {
      const response = await send(CREDENTIALS, { target: null }).expect(400);

      expect(response.body.message).toBe(
        'x-target-application header is required',
      );
    });

    it('returns 400 when x-application-name is blank', async () => {
      const response = await send(CREDENTIALS, { origin: '   ' }).expect(400);

      expect(response.body.message).toBe(
        'x-application-name header is required',
      );
    });

    it('returns 400 when x-target-application is blank', async () => {
      const response = await send(CREDENTIALS, { target: '   ' }).expect(400);

      expect(response.body.message).toBe(
        'x-target-application header is required',
      );
    });
  });

  describe('applications', () => {
    it('returns 404 when the origin application does not exist', async () => {
      const response = await send(CREDENTIALS, { origin: 'missing' }).expect(
        404,
      );

      expect(response.body).toEqual({
        statusCode: 404,
        error: 'Not Found',
        message: 'Application not found',
      });
    });

    it('returns 404 when the target application does not exist', async () => {
      const response = await send(CREDENTIALS, { target: 'missing' }).expect(
        404,
      );

      expect(response.body.message).toBe('Application not found');
    });
  });

  describe('access', () => {
    it('returns 403 when the user has no access to the origin application', async () => {
      const other = await createApplication(testApp.dataSource, 'other-origin');

      const response = await send(CREDENTIALS, { origin: other.name }).expect(
        403,
      );

      expect(response.body).toEqual({
        statusCode: 403,
        error: 'Forbidden',
        message: 'No access to this application',
      });
    });

    it('returns 403 when the user has no access to the target application', async () => {
      const other = await createApplication(testApp.dataSource, 'other-target');

      const response = await send(CREDENTIALS, { target: other.name }).expect(
        403,
      );

      expect(response.body.message).toBe('No access to this application');
    });

    it('returns 403 when there is no connection between origin and target', async () => {
      const other = await createApplication(testApp.dataSource, 'unconnected');
      await grantAppUserApplication(testApp.dataSource, appUserId, other.id);

      const response = await send(CREDENTIALS, { target: other.name }).expect(
        403,
      );

      expect(response.body).toEqual({
        statusCode: 403,
        error: 'Forbidden',
        message: 'No connection allowed between these applications',
      });
    });

    it('returns 403 when the only connection goes in the opposite direction', async () => {
      const response = await send(CREDENTIALS, {
        origin: 'billing',
        target: 'iam',
      }).expect(403);

      expect(response.body.message).toBe(
        'No connection allowed between these applications',
      );
    });

    it('returns 403 when the user has no role in the target application', async () => {
      await testApp.dataSource.query('DELETE FROM apps_users_roles');

      const response = await send().expect(403);

      expect(response.body).toEqual({
        statusCode: 403,
        error: 'Forbidden',
        message: 'No access to this application',
      });
    });

    it('returns 403 when the roles of the user belong to another application only', async () => {
      await testApp.dataSource.query('DELETE FROM apps_users_roles');
      await grantAppUserRole(testApp.dataSource, appUserId, iam.adminRole);

      await send().expect(403);
    });

    it('returns 403 for a user with access and roles but without any connection', async () => {
      await testApp.dataSource.query(
        'DELETE FROM apps_users_connections WHERE app_user_id = ' + appUserId,
      );

      const response = await send().expect(403);

      expect(response.body).not.toHaveProperty('access_token');
    });
  });
});
