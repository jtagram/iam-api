/**
 * Stable `kid` for the current RSA key pair -- stamped on every signed
 * token's header (see apps-users.module.ts/internal-users.module.ts's
 * `signOptions`) and on the matching entry in the JWKS response (see
 * `modules/jwks/jwks.service.ts`), so a verifier with more than one key
 * cached knows which one a given token was signed with. Bump this if the
 * key pair is ever rotated.
 */
export const JWT_KEY_ID = 'iam-api-rsa-1';
