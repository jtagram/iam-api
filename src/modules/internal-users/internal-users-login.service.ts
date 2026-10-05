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
import { InternalUserConnectionsRepository } from '../../common/database/internal-user-connection/internal-user-connections.repository';
import { InternalUserAppsRepository } from '../../common/database/internal-user/internal-user-apps.repository';
import { InternalUserRolesRepository } from '../../common/database/internal-user/internal-user-roles.repository';
import { InternalUsersRepository } from '../../common/database/internal-user/internal-users.repository';
import { RolesRepository } from '../../common/database/role/roles.repository';
import { AppsPayloadMapper } from '../../common/jwt/apps-payload.mapper';
import { ResponseLogin } from '../../common/dto/response-login.dto';
import { LoginInternalUserDto } from './dto/login-internal-user.dto';
import { InternalUserPayloadJwt } from './internal-user-payload-jwt';

const INVALID_CREDENTIALS_MESSAGE = 'Invalid credentials';

const APPLICATION_NOT_FOUND_MESSAGE = 'Application not found';

const FORBIDDEN_APPLICATION_ACCESS_MESSAGE = 'No access to this application';

const FORBIDDEN_CONNECTION_MESSAGE =
  'No connection allowed between these applications';

@Injectable()
export class InternalUsersLoginService {
  constructor(
    private readonly internalUsersRepository: InternalUsersRepository,
    private readonly applicationsRepository: ApplicationsRepository,
    private readonly internalUserAppsRepository: InternalUserAppsRepository,
    private readonly internalUserConnectionsRepository: InternalUserConnectionsRepository,
    private readonly internalUserRolesRepository: InternalUserRolesRepository,
    private readonly rolesRepository: RolesRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(
    dto: LoginInternalUserDto,
    originApplicationName: string,
    targetApplicationName: string,
  ): Promise<ResponseLogin> {
    const internalUser = await this.internalUsersRepository.findByEmail(
      dto.email,
    );
    if (!internalUser) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      internalUser.password,
    );
    if (!passwordMatches) {
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

    await this.assertHasApplicationAccess(
      internalUser.id,
      originApplication.id,
    );
    await this.assertHasApplicationAccess(internalUser.id, application.id);

    const hasConnection =
      await this.internalUserConnectionsRepository.existsForInternalUserAndApplications(
        internalUser.id,
        originApplication.id,
        application.id,
      );
    if (!hasConnection) {
      throw new ForbiddenException(FORBIDDEN_CONNECTION_MESSAGE);
    }

    const roleIds =
      await this.internalUserRolesRepository.findRoleIdsForInternalUserAndApplication(
        internalUser.id,
        application.id,
      );
    if (roleIds.length === 0) {
      throw new ForbiddenException(FORBIDDEN_APPLICATION_ACCESS_MESSAGE);
    }

    const roles = await this.rolesRepository.findByIds(roleIds);
    const apps = AppsPayloadMapper.buildAppsPayload(application, roles);

    const payload = InternalUserPayloadJwt.builder()
      .withSub(internalUser.id)
      .withEmail(internalUser.email)
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
    internalUserId: number,
    applicationId: number,
  ): Promise<void> {
    const hasApplicationAccess =
      await this.internalUserAppsRepository.existsForInternalUserAndApplication(
        internalUserId,
        applicationId,
      );
    if (!hasApplicationAccess) {
      throw new ForbiddenException(FORBIDDEN_APPLICATION_ACCESS_MESSAGE);
    }
  }
}
