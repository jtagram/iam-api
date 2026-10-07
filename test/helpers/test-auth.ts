import { generateKeyPairSync } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { Role } from '../../src/common/database/role/role.enum';
import { JWT_KEY_ID } from '../../src/common/jwt/jwt-key-id';

/** Value of IAM_APPLICATION_NAME in the e2e environment. */
export const IAM_APPLICATION_NAME = 'iam';

/** Key pair used both by the app (JWT_PRIVATE_KEY / JWT_PUBLIC_KEY) and by the test signer. */
const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

export const TEST_PUBLIC_KEY = publicKey;
export const TEST_PRIVATE_KEY = privateKey;

export interface TestUser {
  email?: string;
  /** Role names carried in `apps.application.roles` (default: ADMIN). */
  roles?: string[];
  /** Application the token is issued for (default: the iam application). */
  applicationName?: string;
}

/** Same claim shape the login endpoints put in the tokens they issue. */
export function claimsFor(user: TestUser = {}): Record<string, unknown> {
  const roles = user.roles ?? [Role.ADMIN];
  const applicationName = user.applicationName ?? IAM_APPLICATION_NAME;
  return {
    sub: 1,
    email: user.email ?? 'admin@example.com',
    origin: applicationName,
    apps: {
      application: {
        id: 1,
        name: applicationName,
        description: 'Application (e2e)',
        roles: roles.map((name, index) => ({
          id: index + 1,
          name,
          description: name,
        })),
      },
    },
  };
}

/** Signs a real RS256 token (kid = JWT_KEY_ID) with arbitrary claims. */
export function signToken(
  claims: Record<string, unknown>,
  options: { expiresIn?: string | number; privateKey?: string } = {},
): string {
  return new JwtService().sign(claims, {
    privateKey: options.privateKey ?? privateKey,
    algorithm: 'RS256',
    keyid: JWT_KEY_ID,
    expiresIn: (options.expiresIn ?? '5m') as never,
  });
}

export function bearerTokenFor(user: TestUser = {}): string {
  return signToken(claimsFor(user));
}

/** `Bearer <token>` of a user with the ADMIN role on the iam application. */
export function adminAuthorization(): string {
  return `Bearer ${bearerTokenFor()}`;
}

export function authorizationHeaderFor(user: TestUser = {}): string {
  return `Bearer ${bearerTokenFor(user)}`;
}

/** Signed token with arbitrary claims, e.g. a verifiable token without `apps`. */
export function authorizationHeaderForClaims(
  claims: Record<string, unknown>,
): string {
  return `Bearer ${signToken(claims)}`;
}

/** Correctly signed token whose `exp` is already in the past. */
export function expiredAuthorization(): string {
  return `Bearer ${signToken(claimsFor(), { expiresIn: -60 })}`;
}

/** Token with a valid shape but signed by a key the app does not trust. */
export function authorizationSignedByAnotherKey(): string {
  const other = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return `Bearer ${signToken(claimsFor(), { privateKey: other.privateKey })}`;
}
