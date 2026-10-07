import { generateKeyPairSync } from 'node:crypto';

export interface RsaKeyPair {
  privateKey: string;
  publicKey: string;
}

/** Real RSA-2048 key pair in PEM (PKCS#8 / SPKI), like the JWT_*_KEY env vars. */
export function generateRsaKeyPair(): RsaKeyPair {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  return { privateKey, publicKey };
}
