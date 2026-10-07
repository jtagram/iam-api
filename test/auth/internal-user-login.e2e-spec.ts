import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from '@jest/globals';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  connectInternalUser,
  createApplication,
  createInternalUser,
  createRole,
  grantInternalUserApplication,
  grantInternalUserRole,
} from '../helpers/seed';
import { TEST_JWT_EXPIRES_IN_SECONDS } from '../helpers/app-test-app';
import { verifyWithPublishedKey } from '../helpers/jwks';
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

describe('POST /internal-users/login (e2e)', () => {
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
  let userId: number;
  let payer: Awaited<ReturnType<typeof createRole>>;
  let reader: Awaited<ReturnType<typeof createRole>>;

  const CREDENTIALS = {
    email: 'user@example.com',
    password: 'user-password-1',
  };
  const WRONG_CREDENTIALS = {
    email: 'user@example.com',
    password: 'wrong-password',
  };
  const UNKNOWN_CREDENTIALS = {
    email: 'nobody@example.com',
    password: 'user-password-1',
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
    const user = await createInternalUser(ds, {
      email: 'user@example.com',
      password: 'user-password-1',
    });
    userId = user.id;
    // fully configured access: iam -> billing with the PAYER role
    await grantInternalUserApplication(ds, userId, iam.iamApplication.id);
    await grantInternalUserApplication(ds, userId, billing.id);
    await connectInternalUser(ds, userId, iam.iamApplication.id, billing.id);
    await grantInternalUserRole(ds, userId, payer);
  });

  interface Headers {
    origin?: string | null;
    target?: string | null;
  }

  function send(body: object = CREDENTIALS, headers: Headers = {}) {
    const req = testApp.http().post('/internal-users/login');
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
        sub: userId,
        email: 'user@example.com',
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
      await grantInternalUserRole(testApp.dataSource, userId, reader);
      await grantInternalUserRole(testApp.dataSource, userId, iam.adminRole);

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

    it('logs the seeded admin into iam through the real endpoint and the token opens the admin endpoints', async () => {
      const login = await send(
        { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
        { target: 'iam' },
      ).expect(200);

      const verified = await verifyWithPublishedKey(
        testApp,
        login.body.access_token,
      );
      expect(
        verified.payload.apps.application.roles.map(
          (r: { name: string }) => r.name,
        ),
      ).toEqual(['ADMIN']);
      for (const path of ['/applications', '/internal-users', '/apps-users']) {
        await testApp
          .http()
          .get(path)
          .set('Authorization', `Bearer ${login.body.access_token}`)
          .expect(200);
      }
    });

    it('issues a token that is accepted by the admin endpoints when the target is iam and the user has the ADMIN role', async () => {
      await connectInternalUser(
        testApp.dataSource,
        userId,
        iam.iamApplication.id,
        iam.iamApplication.id,
      );
      await grantInternalUserRole(testApp.dataSource, userId, iam.adminRole);

      const login = await send(CREDENTIALS, { target: 'iam' }).expect(200);
      await testApp
        .http()
        .get('/applications')
        .set('Authorization', `Bearer ${login.body.access_token}`)
        .expect(200);
    });

    it('accepts the credentials of a user created with POST /internal-users', async () => {
      const created = await testApp
        .http()
        .post('/internal-users')
        .set('Authorization', adminAuthorization())
        .send({
          name: 'New',
          lastname: 'User',
          email: 'new.user@example.com',
          password: 'brand-new-pass',
        })
        .expect(201);
      await grantInternalUserApplication(
        testApp.dataSource,
        created.body.id,
        iam.iamApplication.id,
      );
      await grantInternalUserApplication(
        testApp.dataSource,
        created.body.id,
        billingId,
      );
      await connectInternalUser(
        testApp.dataSource,
        created.body.id,
        iam.iamApplication.id,
        billingId,
      );
      await grantInternalUserRole(testApp.dataSource, created.body.id, payer);

      const response = await send({
        email: 'new.user@example.com',
        password: 'brand-new-pass',
      }).expect(200);

      expect(response.body.access_token).toEqual(expect.any(String));
    });

    it('rejects the stored bcrypt hash used as the password', async () => {
      const row = await testApp.dataSource
        .getRepository(InternalUserEntity)
        .findOneByOrFail({ id: userId });

      await send({ email: 'user@example.com', password: row.password }).expect(
        401,
      );
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
    it('returns 400 when the email is not valid', async () => {
      const response = await send({
        email: 'not-an-email',
        password: 'user-password-1',
      }).expect(400);

      expect(response.body.message).toEqual(['email must be an email']);
    });

    it('returns 400 when the password is empty', async () => {
      const response = await send({
        email: 'user@example.com',
        password: '',
      }).expect(400);

      expect(response.body.message).toEqual(['password should not be empty']);
    });

    it('returns 400 when the email is longer than 30 characters', async () => {
      const response = await send({
        email: `${'e'.repeat(25)}@example.com`,
        password: 'user-password-1',
      }).expect(400);

      expect(response.body.message).toEqual([
        'email must be shorter than or equal to 30 characters',
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
      await grantInternalUserApplication(testApp.dataSource, userId, other.id);

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
      await testApp.dataSource.query('DELETE FROM internal_users_roles');

      const response = await send().expect(403);

      expect(response.body).toEqual({
        statusCode: 403,
        error: 'Forbidden',
        message: 'No access to this application',
      });
    });

    it('returns 403 when the roles of the user belong to another application only', async () => {
      await testApp.dataSource.query('DELETE FROM internal_users_roles');
      await grantInternalUserRole(testApp.dataSource, userId, iam.adminRole);

      await send().expect(403);
    });

    it('returns 403 for a user with access and roles but without any connection', async () => {
      await testApp.dataSource.query(
        'DELETE FROM internal_users_connections WHERE internal_user_id = ' +
          userId,
      );

      const response = await send().expect(403);

      expect(response.body).not.toHaveProperty('access_token');
    });
  });
});
