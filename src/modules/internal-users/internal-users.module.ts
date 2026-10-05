import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JWT_KEY_ID } from '../../common/jwt/jwt-key-id';
import { InternalUsersController } from './internal-users.controller';
import { InternalUsersLoginController } from './internal-users-login.controller';
import { InternalUsersService } from './internal-users.service';
import { InternalUsersLoginService } from './internal-users-login.service';

const jwtModule = JwtModule.registerAsync({
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    privateKey: configService.get<string>('JWT_PRIVATE_KEY'),
    signOptions: { algorithm: 'RS256', keyid: JWT_KEY_ID },
  }),
});

@Module({
  imports: [jwtModule],
  controllers: [InternalUsersController, InternalUsersLoginController],
  providers: [InternalUsersService, InternalUsersLoginService],
})
export class InternalUsersModule {}
