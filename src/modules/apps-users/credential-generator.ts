import { randomBytes } from 'node:crypto';

const CLIENTE_ID_MAX_LENGTH = 15;

export class CredentialGenerator {
  static generateClienteId(): string {
    return randomBytes(12)
      .toString('base64url')
      .slice(0, CLIENTE_ID_MAX_LENGTH);
  }

  static generateClienteSecret(): string {
    return randomBytes(32).toString('base64url');
  }
}
