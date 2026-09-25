import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationEntity } from './application/application.entity';
import { ApplicationsRepository } from './application/applications.repository';
import { AppUserEntity } from './app-user/app-user.entity';
import { AppUsersRepository } from './app-user/app-users.repository';
import { InternalUserAppEntity } from './internal-user/internal-user-app.entity';
import { InternalUserAppsRepository } from './internal-user/internal-user-apps.repository';
import { InternalUserEntity } from './internal-user/internal-user.entity';
import { InternalUserRoleEntity } from './internal-user/internal-user-role.entity';
import { InternalUserRolesRepository } from './internal-user/internal-user-roles.repository';
import { InternalUsersRepository } from './internal-user/internal-users.repository';
import { RoleEntity } from './role/role.entity';
import { RolesRepository } from './role/roles.repository';
import { UserAppEntity } from './user-application/user-app.entity';
import { UserAppsRepository } from './user-application/user-apps.repository';
import { UserRoleEntity } from './user-role/user-role.entity';
import { UserRolesRepository } from './user-role/user-roles.repository';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DATABASE_HOST'),
        port: parseInt(
          configService.get<string>('DATABASE_PORT') ?? '5432',
          10,
        ),
        username: configService.get<string>('POSTGRES_USER'),
        password: configService.get<string>('POSTGRES_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
        entities: [
          ApplicationEntity,
          AppUserEntity,
          RoleEntity,
          UserRoleEntity,
          UserAppEntity,
          InternalUserEntity,
          InternalUserRoleEntity,
          InternalUserAppEntity,
        ],
        synchronize: false,
      }),
    }),
    TypeOrmModule.forFeature([
      ApplicationEntity,
      AppUserEntity,
      RoleEntity,
      UserRoleEntity,
      UserAppEntity,
      InternalUserEntity,
      InternalUserRoleEntity,
      InternalUserAppEntity,
    ]),
  ],
  providers: [
    ApplicationsRepository,
    AppUsersRepository,
    RolesRepository,
    UserRolesRepository,
    UserAppsRepository,
    InternalUsersRepository,
    InternalUserRolesRepository,
    InternalUserAppsRepository,
  ],
  exports: [
    ApplicationsRepository,
    AppUsersRepository,
    RolesRepository,
    UserRolesRepository,
    UserAppsRepository,
    InternalUsersRepository,
    InternalUserRolesRepository,
    InternalUserAppsRepository,
    TypeOrmModule,
  ],
})
export class DatabaseModule {}
