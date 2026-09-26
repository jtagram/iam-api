import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(private readonly configService: ConfigService) {}

  getPublicKey(): { publicKey: string } {
    const publicKey = this.configService.get<string>('JWT_PUBLIC_KEY');
    if (!publicKey) {
      throw new Error('AuthService: JWT_PUBLIC_KEY is required');
    }
    return { publicKey };
  }
}
