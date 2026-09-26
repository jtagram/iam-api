import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ApplicationsRepository } from '../../common/database/application/applications.repository';
import { InternalUserAppEntity } from '../../common/database/internal-user/internal-user-app.entity';
import { InternalUserAppsRepository } from '../../common/database/internal-user/internal-user-apps.repository';
import { InternalUserRoleEntity } from '../../common/database/internal-user/internal-user-role.entity';
import { InternalUserRolesRepository } from '../../common/database/internal-user/internal-user-roles.repository';
import { InternalUsersRepository } from '../../common/database/internal-user/internal-users.repository';
import { RolesRepository } from '../../common/database/role/roles.repository';
import { AssignApplicationDto } from '../../common/dto/assign-application.dto';
import { AssignRoleDto } from '../../common/dto/assign-role.dto';
import { CreateInternalUserDto } from './dto/create-internal-user.dto';
import { InternalUserCreatedResponse } from './dto/internal-user-created-response.dto';
import { InternalUserApplicationRolesResponse } from './dto/internal-user-application-roles-response.dto';
import { FindInternalUsersByRoleDto } from './dto/find-internal-users-by-role.dto';
import { InternalUserMapper } from './internal-user.mapper';

const BCRYPT_SALT_ROUNDS = 10;

const INTERNAL_USER_NOT_FOUND_MESSAGE = 'Internal user not found';
const APPLICATION_NOT_FOUND_MESSAGE = 'Application not found';
const ROLE_NOT_FOUND_MESSAGE = 'Role not found';
const APPLICATION_ALREADY_ASSIGNED_MESSAGE =
  'Application already assigned to this user';
const ROLE_ALREADY_ASSIGNED_MESSAGE = 'Role already assigned to this user';

@Injectable()
export class InternalUsersService {
  constructor(
    private readonly internalUsersRepository: InternalUsersRepository,
    private readonly applicationsRepository: ApplicationsRepository,
    private readonly rolesRepository: RolesRepository,
    private readonly internalUserAppsRepository: InternalUserAppsRepository,
    private readonly internalUserRolesRepository: InternalUserRolesRepository,
  ) {}

  async create(
    dto: CreateInternalUserDto,
  ): Promise<InternalUserCreatedResponse> {
    const existing = await this.internalUsersRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
    const internalUserEntity = InternalUserMapper.toEntity(dto, hashedPassword);
    const createdInternalUser =
      await this.internalUsersRepository.createInternalUser(internalUserEntity);

    return InternalUserMapper.toCreatedResponse(createdInternalUser);
  }

  async findAll(): Promise<InternalUserCreatedResponse[]> {
    const internalUsers = await this.internalUsersRepository.findAll();
    return internalUsers.map((internalUser) =>
      InternalUserMapper.toResponse(internalUser),
    );
  }

  async findByApplicationAndRoles(
    dto: FindInternalUsersByRoleDto,
  ): Promise<InternalUserCreatedResponse[]> {
    const application = await this.applicationsRepository.findByName(
      dto.applicationName,
    );
    if (!application) {
      throw new NotFoundException(APPLICATION_NOT_FOUND_MESSAGE);
    }

    const roleNames = dto.roles
      .split(',')
      .map((name) => name.trim())
      .filter((name) => name.length > 0);
    const roles = await this.rolesRepository.findAllByApplicationIdAndNames(
      application.id,
      roleNames,
    );

    const internalUserIds =
      await this.internalUserRolesRepository.findInternalUserIdsByRoleIds(
        roles.map((role) => role.id),
      );
    const internalUsers =
      await this.internalUsersRepository.findByIds(internalUserIds);

    return internalUsers.map((internalUser) =>
      InternalUserMapper.toResponse(internalUser),
    );
  }

  async findAssignedApplications(
    userId: number,
  ): Promise<InternalUserApplicationRolesResponse[]> {
    const internalUser = await this.internalUsersRepository.findById(userId);
    if (!internalUser) {
      throw new NotFoundException(INTERNAL_USER_NOT_FOUND_MESSAGE);
    }

    const internalUserApps =
      await this.internalUserAppsRepository.findAllByInternalUserId(userId);
    const applications = await this.applicationsRepository.findByIds(
      internalUserApps.map((internalUserApp) => internalUserApp.applicationId),
    );

    const internalUserRoles =
      await this.internalUserRolesRepository.findAllByInternalUserId(userId);
    const roles = await this.rolesRepository.findByIds(
      internalUserRoles.map((internalUserRole) => internalUserRole.roleId),
    );

    return applications.map((application) => ({
      applicationId: application.id,
      applicationName: application.name,
      applicationDescription: application.description,
      roles: roles
        .filter((role) => role.applicationId === application.id)
        .map((role) => ({
          id: role.id,
          name: role.name,
          description: role.description,
        })),
    }));
  }

  async assignApplication(
    userId: number,
    dto: AssignApplicationDto,
  ): Promise<InternalUserAppEntity> {
    const internalUser = await this.internalUsersRepository.findById(userId);
    if (!internalUser) {
      throw new NotFoundException(INTERNAL_USER_NOT_FOUND_MESSAGE);
    }

    const application = await this.applicationsRepository.findById(
      dto.applicationId,
    );
    if (!application) {
      throw new NotFoundException(APPLICATION_NOT_FOUND_MESSAGE);
    }

    const alreadyAssigned =
      await this.internalUserAppsRepository.existsForInternalUserAndApplication(
        userId,
        dto.applicationId,
      );
    if (alreadyAssigned) {
      throw new ConflictException(APPLICATION_ALREADY_ASSIGNED_MESSAGE);
    }

    const entity = new InternalUserAppEntity();
    entity.internalUserId = userId;
    entity.applicationId = dto.applicationId;
    return this.internalUserAppsRepository.createAssignment(entity);
  }

  async assignRole(
    userId: number,
    dto: AssignRoleDto,
  ): Promise<InternalUserRoleEntity> {
    const internalUser = await this.internalUsersRepository.findById(userId);
    if (!internalUser) {
      throw new NotFoundException(INTERNAL_USER_NOT_FOUND_MESSAGE);
    }

    const role = await this.rolesRepository.findById(dto.roleId);
    if (!role) {
      throw new NotFoundException(ROLE_NOT_FOUND_MESSAGE);
    }

    const alreadyAssigned =
      await this.internalUserRolesRepository.existsForInternalUserAndRole(
        userId,
        dto.roleId,
      );
    if (alreadyAssigned) {
      throw new ConflictException(ROLE_ALREADY_ASSIGNED_MESSAGE);
    }

    const entity = new InternalUserRoleEntity();
    entity.internalUserId = userId;
    entity.roleId = dto.roleId;
    entity.applicationId = role.applicationId;
    return this.internalUserRolesRepository.createAssignment(entity);
  }
}
