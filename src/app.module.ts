import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ApplicationsModule } from './modules/applications/applications.module';
import { AppUsersModule } from './modules/apps-users/apps-users.module';
import { RolesModule } from './modules/roles/roles.module';
import { InternalUsersModule } from './modules/internal-users/internal-users.module';
import { EnvModule } from './common/config/env.module';
import { DatabaseModule } from './common/database/database.module';
import { DatabaseExceptionFilter } from './common/filters/database-exception.filter';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { UnknownExceptionFilter } from './common/filters/unknown-exception.filter';
import { ApplicationAccessGuard } from './common/guards/application-access.guard';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { JwksModule } from './modules/jwks/jwks.module';
import { LoggerModule } from './instrument/logger/logger.module';

const jwtModule = JwtModule.registerAsync({
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    publicKey: configService.get<string>('JWT_PUBLIC_KEY'),
    verifyOptions: { algorithms: ['RS256'] },
  }),
});

@Module({
  imports: [
    EnvModule,
    LoggerModule,
    DatabaseModule,
    jwtModule,
    JwksModule,
    ApplicationsModule,
    AppUsersModule,
    RolesModule,
    InternalUsersModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: UnknownExceptionFilter },
    { provide: APP_FILTER, useClass: DatabaseExceptionFilter },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ApplicationAccessGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
