import { beforeAll, describe, expect, it, jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { createPublicKey } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import {
  generateRsaKeyPair,
  RsaKeyPair,
} from '../../../../../test/helpers/rsa-keys';
import { JWT_KEY_ID } from '../../../../common/jwt/jwt-key-id';
import { JwksService } from '../../jwks.service';

function configWith(publicKey: string | undefined): ConfigService {
  return {
    get: jest.fn((key: string) =>
      key === 'JWT_PUBLIC_KEY' ? publicKey : undefined,
    ),
  } as unknown as ConfigService;
}

describe('JwksService', () => {
  let keys: RsaKeyPair;

  beforeAll(() => {
    keys = generateRsaKeyPair();
  });

  describe('constructor', () => {
    it('throws when JWT_PUBLIC_KEY is not configured', () => {
      expect(() => new JwksService(configWith(undefined))).toThrow(
        'JwksService: JWT_PUBLIC_KEY is required',
      );
    });

    it('throws when JWT_PUBLIC_KEY is empty', () => {
      expect(() => new JwksService(configWith(''))).toThrow(
        'JwksService: JWT_PUBLIC_KEY is required',
      );
    });

    it('throws when JWT_PUBLIC_KEY is not a valid key', () => {
      expect(() => new JwksService(configWith('not a pem'))).toThrow();
    });

    it('reads the key from JWT_PUBLIC_KEY', () => {
      const config = configWith(keys.publicKey);

      new JwksService(config);

      expect(config.get).toHaveBeenCalledWith('JWT_PUBLIC_KEY');
    });
  });

  describe('getJwks', () => {
    it('returns a key set with exactly one key', () => {
      const jwks = new JwksService(configWith(keys.publicKey)).getJwks();

      expect(jwks.keys).toHaveLength(1);
    });

    it('describes the key as an RS256 signature key with the current kid', () => {
      const [key] = new JwksService(configWith(keys.publicKey)).getJwks().keys;

      expect(key).toMatchObject({
        kty: 'RSA',
        use: 'sig',
        alg: 'RS256',
        kid: JWT_KEY_ID,
      });
    });

    it('exposes the public modulus and exponent of the configured key', () => {
      const expected = createPublicKey(keys.publicKey).export({
        format: 'jwk',
      });

      const [key] = new JwksService(configWith(keys.publicKey)).getJwks().keys;

      expect(key.n).toBe(expected.n);
      expect(key.e).toBe(expected.e);
    });

    it('never exposes private key members', () => {
      const [key] = new JwksService(configWith(keys.publicKey)).getJwks().keys;

      for (const member of ['d', 'p', 'q', 'dp', 'dq', 'qi']) {
        expect(key).not.toHaveProperty(member);
      }
    });

    it('returns a fresh object each time so callers cannot alter the stored key', () => {
      const service = new JwksService(configWith(keys.publicKey));

      const first = service.getJwks();
      first.keys[0].kid = 'tampered';

      expect(service.getJwks().keys[0].kid).toBe(JWT_KEY_ID);
    });

    it('publishes a key that verifies tokens signed with the matching private key', () => {
      const token = new JwtService({
        privateKey: keys.privateKey,
        signOptions: { algorithm: 'RS256', keyid: JWT_KEY_ID },
      }).sign({ sub: 1 });
      const [key] = new JwksService(configWith(keys.publicKey)).getJwks().keys;
      const publishedPem = createPublicKey({
        key: key as never,
        format: 'jwk',
      }).export({ type: 'spki', format: 'pem' }) as string;

      const verified = new JwtService({
        publicKey: publishedPem,
        verifyOptions: { algorithms: ['RS256'] },
      }).verify(token);

      expect(verified.sub).toBe(1);
    });
  });
});
