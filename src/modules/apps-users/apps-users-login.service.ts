import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ApplicationsRepository } from '../../common/database/application/applications.repository';
import { AppUsersRepository } from '../../common/database/app-user/app-users.repository';
import { RolesRepository } from '../../common/database/role/roles.repository';
import { AppUserConnectionsRepository } from '../../common/database/app-user-connection/app-user-connections.repository';
import { UserAppsRepository } from '../../common/database/user-application/user-apps.repository';
import { UserRolesRepository } from '../../common/database/user-role/user-roles.repository';
import { AppsPayloadMapper } from '../../common/jwt/apps-payload.mapper';
import { ResponseLogin } from '../../common/dto/response-login.dto';
import { LoginDto } from './dto/login.dto';
import { AppUserPayloadJwt } from './app-user-payload-jwt';

const INVALID_CREDENTIALS_MESSAGE = 'Invalid credentials';

const APPLICATION_NOT_FOUND_MESSAGE = 'Application not found';

const FORBIDDEN_APPLICATION_ACCESS_MESSAGE = 'No access to this application';

const FORBIDDEN_CONNECTION_MESSAGE =
  'No connection allowed between these applications';

@Injectable()
export class AppUsersLoginService {
  constructor(
    private readonly appUsersRepository: AppUsersRepository,
    private readonly applicationsRepository: ApplicationsRepository,
    private readonly userAppsRepository: UserAppsRepository,
    private readonly appUserConnectionsRepository: AppUserConnectionsRepository,
    private readonly userRolesRepository: UserRolesRepository,
    private readonly rolesRepository: RolesRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(
    dto: LoginDto,
    originApplicationName: string,
    targetApplicationName: string,
  ): Promise<ResponseLogin> {
    const appUser = await this.appUsersRepository.findByClienteId(
      dto.clienteId,
    );
    if (!appUser) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const secretMatches = await bcrypt.compare(
      dto.clienteSecret,
      appUser.clienteSecret,
    );
    if (!secretMatches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const originApplication = await this.applicationsRepository.findByName(
      originApplicationName,
    );
    const application = await this.applicationsRepository.findByName(
      targetApplicationName,
    );
    if (!originApplication || !application) {
      throw new NotFoundException(APPLICATION_NOT_FOUND_MESSAGE);
    }

    await this.assertHasApplicationAccess(appUser.id, originApplication.id);
    await this.assertHasApplicationAccess(appUser.id, application.id);

    const hasConnection =
      await this.appUserConnectionsRepository.existsForAppUserAndApplications(
        appUser.id,
        originApplication.id,
        application.id,
      );
    if (!hasConnection) {
      throw new ForbiddenException(FORBIDDEN_CONNECTION_MESSAGE);
    }

    const roleIds =
      await this.userRolesRepository.findRoleIdsForAppUserAndApplication(
        appUser.id,
        application.id,
      );
    if (roleIds.length === 0) {
      throw new ForbiddenException(FORBIDDEN_APPLICATION_ACCESS_MESSAGE);
    }

    const roles = await this.rolesRepository.findByIds(roleIds);
    const apps = AppsPayloadMapper.buildAppsPayload(application, roles);

    const payload = AppUserPayloadJwt.builder()
      .withSub(appUser.id)
      .withClienteId(appUser.clienteId)
      .withApps(apps)
      .withOrigin(originApplication.name)
      .build();

    const expiresIn = this.configService.get<string>(
      'JWT_EXPIRES_IN',
    ) as JwtSignOptions['expiresIn'];

    const access_token = this.jwtService.sign(payload, { expiresIn });

    return new ResponseLogin(access_token);
  }

  private async assertHasApplicationAccess(
    appUserId: number,
    applicationId: number,
  ): Promise<void> {
    const hasApplicationAccess =
      await this.userAppsRepository.existsForAppUserAndApplication(
        appUserId,
        applicationId,
      );
    if (!hasApplicationAccess) {
      throw new ForbiddenException(FORBIDDEN_APPLICATION_ACCESS_MESSAGE);
    }
  }
}
