import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JWT_KEY_ID } from '../../common/jwt/jwt-key-id';
import { AppUsersController } from './apps-users.controller';
import { AppUsersService } from './apps-users.service';
import { AppUsersLoginService } from './apps-users-login.service';

const jwtModule = JwtModule.registerAsync({
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    privateKey: configService.get<string>('JWT_PRIVATE_KEY'),
    signOptions: { algorithm: 'RS256', keyid: JWT_KEY_ID },
  }),
});

@Module({
  imports: [jwtModule],
  controllers: [AppUsersController],
  providers: [AppUsersService, AppUsersLoginService],
})
export class AppUsersModule {}
