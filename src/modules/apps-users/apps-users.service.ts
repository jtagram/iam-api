import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AppUsersRepository } from '../../common/database/app-user/app-users.repository';
import { ApplicationsRepository } from '../../common/database/application/applications.repository';
import { RolesRepository } from '../../common/database/role/roles.repository';
import { UserAppEntity } from '../../common/database/user-application/user-app.entity';
import { UserAppsRepository } from '../../common/database/user-application/user-apps.repository';
import { UserRoleEntity } from '../../common/database/user-role/user-role.entity';
import { UserRolesRepository } from '../../common/database/user-role/user-roles.repository';
import { AssignApplicationDto } from '../../common/dto/assign-application.dto';
import { AssignRoleDto } from '../../common/dto/assign-role.dto';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { CreateAppUserDto } from './dto/create-app-user.dto';
import { AppUserMapper } from './app-user.mapper';
import { AppUserCreatedResponse } from './dto/app-user-created-response.dto';
import { AppUserResponse } from './dto/app-user-response.dto';
import { CredentialGenerator } from './credential-generator';

const BCRYPT_SALT_ROUNDS = 10;

const APP_USER_NOT_FOUND_MESSAGE = 'Application user not found';
const APPLICATION_NOT_FOUND_MESSAGE = 'Application not found';
const ROLE_NOT_FOUND_MESSAGE = 'Role not found';
const APPLICATION_ALREADY_ASSIGNED_MESSAGE =
  'Application already assigned to this user';
const ROLE_ALREADY_ASSIGNED_MESSAGE = 'Role already assigned to this user';

@Injectable()
export class AppUsersService {
  constructor(
    private readonly appUsersRepository: AppUsersRepository,
    private readonly applicationsRepository: ApplicationsRepository,
    private readonly rolesRepository: RolesRepository,
    private readonly userAppsRepository: UserAppsRepository,
    private readonly userRolesRepository: UserRolesRepository,
  ) {}

  async create(
    dto: CreateAppUserDto,
  ): Promise<ResponseBody<AppUserCreatedResponse>> {
    const clienteId = CredentialGenerator.generateClienteId();
    const plaintextClienteSecret = CredentialGenerator.generateClienteSecret();
    const hashedClienteSecret = await this.hashSecret(plaintextClienteSecret);

    const appUserEntity = AppUserMapper.toEntity(
      dto,
      clienteId,
      hashedClienteSecret,
    );
    const createdAppUser =
      await this.appUsersRepository.createAppUser(appUserEntity);

    return ResponseBody.builder<AppUserCreatedResponse>()
      .withMsg(
        'Application user created successfully — store clienteSecret now, it cannot be retrieved again',
      )
      .withData(
        AppUserMapper.toCreatedResponse(createdAppUser, plaintextClienteSecret),
      )
      .build();
  }

  async findAll(): Promise<ResponseBody<AppUserResponse[]>> {
    const appUsers = await this.appUsersRepository.findAll();

    return ResponseBody.builder<AppUserResponse[]>()
      .withMsg('Application users retrieved successfully')
      .withData(appUsers.map((appUser) => AppUserMapper.toResponse(appUser)))
      .build();
  }

  hashSecret(secret: string): Promise<string> {
    return bcrypt.hash(secret, BCRYPT_SALT_ROUNDS);
  }

  async assignApplication(
    userId: number,
    dto: AssignApplicationDto,
  ): Promise<ResponseBody<UserAppEntity>> {
    const appUser = await this.appUsersRepository.findById(userId);
    if (!appUser) {
      throw new NotFoundException(APP_USER_NOT_FOUND_MESSAGE);
    }

    const application = await this.applicationsRepository.findById(
      dto.applicationId,
    );
    if (!application) {
      throw new NotFoundException(APPLICATION_NOT_FOUND_MESSAGE);
    }

    const alreadyAssigned =
      await this.userAppsRepository.existsForAppUserAndApplication(
        userId,
        dto.applicationId,
      );
    if (alreadyAssigned) {
      throw new ConflictException(APPLICATION_ALREADY_ASSIGNED_MESSAGE);
    }

    const entity = new UserAppEntity();
    entity.appUserId = userId;
    entity.applicationId = dto.applicationId;
    const created = await this.userAppsRepository.createAssignment(entity);

    return ResponseBody.builder<UserAppEntity>()
      .withMsg('Application assigned to user successfully')
      .withData(created)
      .build();
  }

  async assignRole(
    userId: number,
    dto: AssignRoleDto,
  ): Promise<ResponseBody<UserRoleEntity>> {
    const appUser = await this.appUsersRepository.findById(userId);
    if (!appUser) {
      throw new NotFoundException(APP_USER_NOT_FOUND_MESSAGE);
    }

    const role = await this.rolesRepository.findById(dto.roleId);
    if (!role) {
      throw new NotFoundException(ROLE_NOT_FOUND_MESSAGE);
    }

    const alreadyAssigned =
      await this.userRolesRepository.existsForAppUserAndRole(
        userId,
        dto.roleId,
      );
    if (alreadyAssigned) {
      throw new ConflictException(ROLE_ALREADY_ASSIGNED_MESSAGE);
    }

    const entity = new UserRoleEntity();
    entity.appUserId = userId;
    entity.roleId = dto.roleId;
    entity.applicationId = role.applicationId;
    const created = await this.userRolesRepository.createAssignment(entity);

    return ResponseBody.builder<UserRoleEntity>()
      .withMsg('Role assigned to user successfully')
      .withData(created)
      .build();
  }
}
