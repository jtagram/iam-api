import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import * as bcrypt from 'bcrypt';
import { InternalUserEntity } from '../../src/common/database/internal-user/internal-user.entity';
import { InternalUsersRepository } from '../../src/common/database/internal-user/internal-users.repository';
import { createBarrier } from '../helpers/concurrency';
import { AppTestApp, createAppTestApp } from '../helpers/app-test-app';
import { SeededIam, seedIamAdmin } from '../helpers/seed';
import {
  adminAuthorization,
  authorizationHeaderFor,
  authorizationHeaderForClaims,
  authorizationSignedByAnotherKey,
  expiredAuthorization,
} from '../helpers/test-auth';

describe('POST /internal-users (e2e)', () => {
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
      name: 'Jane',
      lastname: 'Doe',
      email: 'jane.doe@example.com',
      password: 'a-strong-password',
      ...overrides,
    };
  }

  function send(
    authorization: string | null = adminAuthorization(),
    body: object = validBody(),
  ) {
    const req = testApp.http().post('/internal-users');
    if (authorization) {
      req.set('Authorization', authorization);
    }
    return req.send(body);
  }

  function internalUserCount() {
    return testApp.dataSource.getRepository(InternalUserEntity).count();
  }

  describe('creation', () => {
    it('returns 201 with a bare body without the password', async () => {
      const response = await send().expect(201);

      expect(response.body).toEqual({
        id: expect.any(Number),
        name: 'Jane',
        lastname: 'Doe',
        email: 'jane.doe@example.com',
      });
    });

    it('persists the user storing only a bcrypt hash of the password', async () => {
      const response = await send().expect(201);

      const row = await testApp.dataSource
        .getRepository(InternalUserEntity)
        .findOneByOrFail({ id: response.body.id });
      expect(row.email).toBe('jane.doe@example.com');
      expect(row.name).toBe('Jane');
      expect(row.lastname).toBe('Doe');
      expect(row.password).not.toBe('a-strong-password');
      expect(row.password).toMatch(/^\$2[aby]\$10\$/);
      expect(await bcrypt.compare('a-strong-password', row.password)).toBe(
        true,
      );
      expect(await internalUserCount()).toBe(2);
    });

    it('ignores unknown properties (whitelist)', async () => {
      const response = await send(
        adminAuthorization(),
        validBody({ id: 999, role: 'ADMIN' }),
      ).expect(201);

      expect(response.body.id).not.toBe(999);
      expect(response.body).not.toHaveProperty('role');
    });

    it('accepts boundary lengths (15/15/30 characters, password of 8 and 72 characters)', async () => {
      await send(
        adminAuthorization(),
        validBody({
          name: 'n'.repeat(15),
          lastname: 'l'.repeat(15),
          email: `${'e'.repeat(18)}@example.com`,
          password: 'p'.repeat(8),
        }),
      ).expect(201);
      await send(
        adminAuthorization(),
        validBody({ email: 'second@example.com', password: 'p'.repeat(72) }),
      ).expect(201);
    });
  });

  describe('validation', () => {
    it('returns 400 when the body is empty', async () => {
      const response = await send(adminAuthorization(), {}).expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([
          'name must be a string',
          'lastname must be a string',
          'email must be an email',
          'password must be a string',
        ]),
      );
    });

    it('returns 400 when the email is not valid', async () => {
      const response = await send(
        adminAuthorization(),
        validBody({ email: 'not-an-email' }),
      ).expect(400);

      expect(response.body.message).toEqual(['email must be an email']);
    });

    it('returns 400 when the email is longer than 30 characters', async () => {
      const response = await send(
        adminAuthorization(),
        validBody({ email: `${'e'.repeat(25)}@example.com` }),
      ).expect(400);

      expect(response.body.message).toEqual([
        'email must be shorter than or equal to 30 characters',
      ]);
    });

    it('returns 400 when the password is shorter than 8 characters', async () => {
      const response = await send(
        adminAuthorization(),
        validBody({ password: 'short' }),
      ).expect(400);

      expect(response.body.message).toEqual([
        'password must be longer than or equal to 8 characters',
      ]);
    });

    it('returns 400 when the password is longer than 72 characters (bcrypt limit)', async () => {
      const response = await send(
        adminAuthorization(),
        validBody({ password: 'p'.repeat(73) }),
      ).expect(400);

      expect(response.body.message).toEqual([
        'password must be shorter than or equal to 72 characters',
      ]);
    });

    it('returns 400 when the name or lastname is longer than 15 characters', async () => {
      const response = await send(
        adminAuthorization(),
        validBody({ name: 'n'.repeat(16), lastname: 'l'.repeat(16) }),
      ).expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([
          'name must be shorter than or equal to 15 characters',
          'lastname must be shorter than or equal to 15 characters',
        ]),
      );
    });

    it('does not persist anything when validation fails', async () => {
      await send(adminAuthorization(), validBody({ email: 'nope' })).expect(
        400,
      );

      expect(await internalUserCount()).toBe(1);
    });
  });

  describe('conflicts', () => {
    it('returns 409 when the email is already in use', async () => {
      await send().expect(201);

      const response = await send().expect(409);

      expect(response.body).toEqual({
        statusCode: 409,
        error: 'Conflict',
        message: 'Email already in use',
      });
      expect(await internalUserCount()).toBe(2);
    });

    it('returns 409 for the seeded admin email', async () => {
      await send(
        adminAuthorization(),
        validBody({ email: 'admin@example.com' }),
      ).expect(409);
    });

    it('treats emails as case-sensitive (documents current behavior)', async () => {
      await send(
        adminAuthorization(),
        validBody({ email: 'Admin@example.com' }),
      ).expect(201);

      expect(await internalUserCount()).toBe(2);
    });

    it('answers 500 with the generic message to the loser of a concurrent duplicate creation and persists a single row (documents current behavior)', async () => {
      const barrier = createBarrier(2);
      const original = InternalUsersRepository.prototype.findByEmail;
      const spy = jest
        .spyOn(InternalUsersRepository.prototype, 'findByEmail')
        .mockImplementation(async function (
          this: InternalUsersRepository,
          email: string,
        ) {
          await barrier.arrive();
          return original.call(this, email);
        });

      try {
        const [first, second] = await Promise.all([send(), send()]);

        expect([first.status, second.status].sort()).toEqual([201, 500]);
        const failed = first.status === 500 ? first : second;
        expect(failed.body).toEqual({
          statusCode: 500,
          message: 'An unexpected error occurred. Please try again later.',
        });
        const rows = await testApp.dataSource
          .getRepository(InternalUserEntity)
          .findBy({ email: 'jane.doe@example.com' });
        expect(rows).toHaveLength(1);
      } finally {
        spy.mockRestore();
      }
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
