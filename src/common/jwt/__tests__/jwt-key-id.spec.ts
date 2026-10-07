import { describe, expect, it } from '@jest/globals';
import { JWT_KEY_ID } from '../jwt-key-id';

describe('JWT_KEY_ID', () => {
  it('is the stable kid of the current RSA key pair', () => {
    expect(JWT_KEY_ID).toBe('iam-api-rsa-1');
  });
});
