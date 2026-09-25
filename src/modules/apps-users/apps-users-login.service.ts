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
import { AppUsersRepository } from '../../common/database/app-user/app-users.repository';
import { RolesRepository } from '../../common/database/role/roles.repository';
import { UserRolesRepository } from '../../common/database/user-role/user-roles.repository';
import { AppsPayloadMapper } from '../../common/jwt/apps-payload.mapper';
import { ResponseLogin } from '../../common/dto/response-login.dto';
import { LoginDto } from './dto/login.dto';
import { AppUserPayloadJwt } from './app-user-payload-jwt';

const INVALID_CREDENTIALS_MESSAGE = 'Invalid credentials';

const APPLICATION_NOT_FOUND_MESSAGE = 'Application not found';

const MISSING_APPLICATION_NAME_MESSAGE = 'application_name header is required';

const FORBIDDEN_APPLICATION_ACCESS_MESSAGE = 'No access to this application';

@Injectable()
export class AppUsersLoginService {
  constructor(
    private readonly appUsersRepository: AppUsersRepository,
    private readonly applicationsRepository: ApplicationsRepository,
    private readonly userRolesRepository: UserRolesRepository,
    private readonly rolesRepository: RolesRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto, applicationName: string): Promise<ResponseLogin> {
    if (!applicationName) {
      throw new BadRequestException(MISSING_APPLICATION_NAME_MESSAGE);
    }

    const application =
      await this.applicationsRepository.findByName(applicationName);
    if (!application) {
      throw new NotFoundException(APPLICATION_NOT_FOUND_MESSAGE);
    }

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
      .build();

    const access_token = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>(
        'JWT_EXPIRES_IN',
      ) as JwtSignOptions['expiresIn'],
    });

    return new ResponseLogin(access_token);
  }
}
