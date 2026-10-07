import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from '@jest/globals';
import { createPublicKey } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { fetchJwks, verifyWithPublishedKey } from '../helpers/jwks';
import { signToken, claimsFor, TEST_PUBLIC_KEY } from '../helpers/test-auth';
import { AppTestApp, createAppTestApp } from '../helpers/app-test-app';
import { SeededIam, seedIamAdmin } from '../helpers/seed';
import {
  adminAuthorization,
  authorizationHeaderFor,
  authorizationHeaderForClaims,
  authorizationSignedByAnotherKey,
  expiredAuthorization,
} from '../helpers/test-auth';

describe('GET /.well-known/jwks.json (e2e)', () => {
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

  function send(authorization: string | null = null) {
    const req = testApp.http().get('/.well-known/jwks.json');
    if (authorization) {
      req.set('Authorization', authorization);
    }
    return req;
  }

  it('returns 200 JSON without any token (public route)', async () => {
    const response = await send().expect(200);

    expect(response.headers['content-type']).toMatch(/application\/json/);
  });

  it('publishes exactly one RS256 signature key with the current key id', async () => {
    const response = await send().expect(200);

    expect(response.body).toEqual({
      keys: [
        {
          kty: 'RSA',
          n: expect.any(String),
          e: 'AQAB',
          use: 'sig',
          alg: 'RS256',
          kid: 'iam-api-rsa-1',
        },
      ],
    });
  });

  it('publishes the public key that matches JWT_PUBLIC_KEY', async () => {
    const response = await send().expect(200);

    const expected = createPublicKey(TEST_PUBLIC_KEY).export({ format: 'jwk' });
    expect(response.body.keys[0].n).toBe(expected.n);
    expect(response.body.keys[0].e).toBe(expected.e);
  });

  it('never publishes private key material', async () => {
    const response = await send().expect(200);

    const jwk = response.body.keys[0];
    for (const privateMember of ['d', 'p', 'q', 'dp', 'dq', 'qi']) {
      expect(jwk).not.toHaveProperty(privateMember);
    }
  });

  it('serves the same key on every request', async () => {
    const first = await send().expect(200);
    const second = await send().expect(200);

    expect(second.body).toEqual(first.body);
  });

  it('is not affected by an invalid Authorization header', async () => {
    await send('Bearer garbage').expect(200);
  });

  it('verifies a token signed with the private key', async () => {
    const token = signToken(claimsFor());

    const verified = await verifyWithPublishedKey(testApp, token);

    expect(verified.header).toEqual(
      expect.objectContaining({ alg: 'RS256', kid: 'iam-api-rsa-1' }),
    );
    expect(verified.payload.apps.application.name).toBe('iam');
  });

  it('does not verify a token signed by another key', async () => {
    const token = authorizationSignedByAnotherKey().replace('Bearer ', '');

    await expect(verifyWithPublishedKey(testApp, token)).rejects.toThrow(
      /invalid signature/,
    );
  });

  it('publishes a key set that matches what the guard accepts: the published key verifies an app-issued token', async () => {
    const jwks = await fetchJwks(testApp);
    const token = signToken(claimsFor());
    const publicKey = createPublicKey({
      key: jwks.keys[0],
      format: 'jwk',
    }).export({
      type: 'spki',
      format: 'pem',
    }) as string;

    expect(() =>
      new JwtService().verify(token, { publicKey, algorithms: ['RS256'] }),
    ).not.toThrow();
  });

  it('only answers GET: POST returns 404', async () => {
    await testApp.http().post('/.well-known/jwks.json').expect(404);
  });
});
