import { createPublicKey, JsonWebKey } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { AppTestApp } from './app-test-app';

export interface Jwks {
  keys: (JsonWebKey & { kid?: string; use?: string; alg?: string })[];
}

export interface DecodedToken {
  header: { alg: string; kid?: string; typ?: string };
  payload: Record<string, any>;
}

/** Reads the public key set the way a downstream service does. */
export async function fetchJwks(testApp: AppTestApp): Promise<Jwks> {
  const response = await testApp
    .http()
    .get('/.well-known/jwks.json')
    .expect(200);
  return response.body as Jwks;
}

/**
 * Verifies `token` (RS256 only) against the key published in the JWKS whose
 * `kid` matches the token header. Throws when the signature or `exp` is wrong.
 */
export async function verifyWithPublishedKey(
  testApp: AppTestApp,
  token: string,
): Promise<DecodedToken> {
  const jwtService = new JwtService();
  const decoded = jwtService.decode(token, { complete: true }) as DecodedToken;
  const jwks = await fetchJwks(testApp);
  const jwk = jwks.keys.find((key) => key.kid === decoded.header.kid);
  if (!jwk) {
    throw new Error(`No key with kid ${decoded.header.kid} in the JWKS`);
  }
  const publicKey = createPublicKey({ key: jwk, format: 'jwk' }).export({
    type: 'spki',
    format: 'pem',
  });
  const payload = jwtService.verify(token, {
    publicKey: publicKey as string,
    algorithms: ['RS256'],
  });
  return { header: decoded.header, payload };
}
