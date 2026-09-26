import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/guards/public.decorator';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('public-key')
  @Public()
  getPublicKey(): { publicKey: string } {
    return this.authService.getPublicKey();
  }
}
