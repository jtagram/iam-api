import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPublicKey, JsonWebKey } from 'crypto';
import { JWT_KEY_ID } from '../../common/jwt/jwt-key-id';

@Injectable()
export class JwksService {
  private readonly jwk: JsonWebKey;

  constructor(configService: ConfigService) {
    const publicKeyPem = configService.get<string>('JWT_PUBLIC_KEY');
    if (!publicKeyPem) {
      throw new Error('JwksService: JWT_PUBLIC_KEY is required');
    }
    this.jwk = createPublicKey(publicKeyPem).export({ format: 'jwk' });
  }

  getJwks(): { keys: JsonWebKey[] } {
    return {
      keys: [{ ...this.jwk, use: 'sig', alg: 'RS256', kid: JWT_KEY_ID }],
    };
  }
}
