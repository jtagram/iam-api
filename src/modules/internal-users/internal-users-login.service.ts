import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ApplicationsRepository } from '../../common/database/application/applications.repository';
import { InternalUserRolesRepository } from '../../common/database/internal-user/internal-user-roles.repository';
import { InternalUsersRepository } from '../../common/database/internal-user/internal-users.repository';
import { RolesRepository } from '../../common/database/role/roles.repository';
import { AppsPayloadMapper } from '../../common/jwt/apps-payload.mapper';
import { ResponseLogin } from '../../common/dto/response-login.dto';
import { LoginInternalUserDto } from './dto/login-internal-user.dto';
import { InternalUserPayloadJwt } from './internal-user-payload-jwt';

const INVALID_CREDENTIALS_MESSAGE = 'Invalid credentials';

const APPLICATION_NOT_FOUND_MESSAGE = 'Application not found';

const MISSING_APPLICATION_NAME_MESSAGE = 'application_name header is required';

const FORBIDDEN_APPLICATION_ACCESS_MESSAGE = 'No access to this application';

@Injectable()
export class InternalUsersLoginService {
  constructor(
    private readonly internalUsersRepository: InternalUsersRepository,
    private readonly applicationsRepository: ApplicationsRepository,
    private readonly internalUserRolesRepository: InternalUserRolesRepository,
    private readonly rolesRepository: RolesRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(
    dto: LoginInternalUserDto,
    applicationName: string,
  ): Promise<ResponseLogin> {
    if (!applicationName) {
      throw new BadRequestException(MISSING_APPLICATION_NAME_MESSAGE);
    }

    const application =
      await this.applicationsRepository.findByName(applicationName);
    if (!application) {
      throw new NotFoundException(APPLICATION_NOT_FOUND_MESSAGE);
    }

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
      .build();

    const access_token = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>(
        'JWT_EXPIRES_IN',
      ) as JwtSignOptions['expiresIn'],
    });

    return new ResponseLogin(access_token);
  }
}
