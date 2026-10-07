import { describe, expect, it } from '@jest/globals';
import { CredentialGenerator } from '../credential-generator';

describe('CredentialGenerator.generateClienteId', () => {
  it('returns exactly 15 characters (fits LoginDto and the column)', () => {
    expect(CredentialGenerator.generateClienteId()).toHaveLength(15);
  });

  it('uses only URL-safe base64 characters', () => {
    expect(CredentialGenerator.generateClienteId()).toMatch(
      /^[A-Za-z0-9_-]{15}$/,
    );
  });

  it('does not repeat across many calls', () => {
    const ids = new Set(
      Array.from({ length: 200 }, () =>
        CredentialGenerator.generateClienteId(),
      ),
    );

    expect(ids.size).toBe(200);
  });
});

describe('CredentialGenerator.generateClienteSecret', () => {
  it('returns 43 URL-safe base64 characters (32 random bytes)', () => {
    expect(CredentialGenerator.generateClienteSecret()).toMatch(
      /^[A-Za-z0-9_-]{43}$/,
    );
  });

  it('does not repeat across many calls', () => {
    const secrets = new Set(
      Array.from({ length: 200 }, () =>
        CredentialGenerator.generateClienteSecret(),
      ),
    );

    expect(secrets.size).toBe(200);
  });

  it('is never equal to a generated client id', () => {
    expect(CredentialGenerator.generateClienteSecret()).not.toBe(
      CredentialGenerator.generateClienteId(),
    );
  });
});
