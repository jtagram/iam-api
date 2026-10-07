import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from '@jest/globals';
import * as bcrypt from 'bcrypt';
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

describe('POST /apps-users (e2e)', () => {
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

  function validBody(overrides: Record<string, unknown> = {}) {
    return {
      name: 'Billing service',
      description: 'Calls the billing API',
      ...overrides,
    };
  }

  function send(
    authorization: string | null = adminAuthorization(),
    body: object = validBody(),
  ) {
    const req = testApp.http().post('/apps-users');
    if (authorization) {
      req.set('Authorization', authorization);
    }
    return req.send(body);
  }

  function appUserCount() {
    return testApp.dataSource.getRepository(AppUserEntity).count();
  }

  describe('creation', () => {
    it('returns 201 with the generated credentials in the {msg, data} envelope', async () => {
      const response = await send().expect(201);

      expect(response.body).toEqual({
        msg: 'Application user created successfully — store clienteSecret now, it cannot be retrieved again',
        data: {
          id: expect.any(Number),
          clienteId: expect.any(String),
          clienteSecret: expect.any(String),
          name: 'Billing service',
          description: 'Calls the billing API',
        },
      });
    });

    it('generates a clienteId of at most 15 url-safe characters and a 43 character secret', async () => {
      const response = await send().expect(201);

      expect(response.body.data.clienteId).toMatch(/^[A-Za-z0-9_-]{1,15}$/);
      expect(response.body.data.clienteSecret).toMatch(/^[A-Za-z0-9_-]{43}$/);
    });

    it('persists the user storing only a bcrypt hash of the secret', async () => {
      const response = await send().expect(201);

      const row = await testApp.dataSource
        .getRepository(AppUserEntity)
        .findOneByOrFail({ id: response.body.data.id });
      expect(row.clienteId).toBe(response.body.data.clienteId);
      expect(row.name).toBe('Billing service');
      expect(row.description).toBe('Calls the billing API');
      expect(row.clienteSecret).not.toBe(response.body.data.clienteSecret);
      expect(row.clienteSecret).toMatch(/^\$2[aby]\$10\$/);
      expect(
        await bcrypt.compare(
          response.body.data.clienteSecret,
          row.clienteSecret,
        ),
      ).toBe(true);
    });

    it('generates different credentials for every user', async () => {
      const first = await send().expect(201);
      const second = await send().expect(201);

      expect(second.body.data.clienteId).not.toBe(first.body.data.clienteId);
      expect(second.body.data.clienteSecret).not.toBe(
        first.body.data.clienteSecret,
      );
      expect(await appUserCount()).toBe(2);
    });

    it('ignores credentials supplied by the client (whitelist)', async () => {
      const response = await send(
        adminAuthorization(),
        validBody({
          clienteId: 'chosen-id',
          clienteSecret: 'chosen-secret',
          id: 999,
        }),
      ).expect(201);

      expect(response.body.data.clienteId).not.toBe('chosen-id');
      expect(response.body.data.clienteSecret).not.toBe('chosen-secret');
      expect(response.body.data.id).not.toBe(999);
    });

    it('accepts a name of exactly 20 characters', async () => {
      await send(
        adminAuthorization(),
        validBody({ name: 'n'.repeat(20) }),
      ).expect(201);
    });
  });

  describe('validation', () => {
    it('returns 400 when the body is empty', async () => {
      const response = await send(adminAuthorization(), {}).expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([
          'name must be a string',
          'description must be a string',
        ]),
      );
    });

    it('returns 400 when the name is longer than 20 characters', async () => {
      const response = await send(
        adminAuthorization(),
        validBody({ name: 'n'.repeat(21) }),
      ).expect(400);

      expect(response.body.message).toEqual([
        'name must be shorter than or equal to 20 characters',
      ]);
    });

    it('returns 400 when the description is longer than 200 characters', async () => {
      const response = await send(
        adminAuthorization(),
        validBody({ description: 'd'.repeat(201) }),
      ).expect(400);

      expect(response.body.message).toEqual([
        'description must be shorter than or equal to 200 characters',
      ]);
    });

    it('returns 400 when a field is not a string', async () => {
      await send(adminAuthorization(), validBody({ name: 42 })).expect(400);
    });

    it('does not persist anything when validation fails', async () => {
      await send(adminAuthorization(), {}).expect(400);

      expect(await appUserCount()).toBe(0);
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
