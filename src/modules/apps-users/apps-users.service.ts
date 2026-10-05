import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AppUserConnectionEntity } from '../../common/database/app-user-connection/app-user-connection.entity';
import { AppUserConnectionsRepository } from '../../common/database/app-user-connection/app-user-connections.repository';
import { AppUsersRepository } from '../../common/database/app-user/app-users.repository';
import { ApplicationsRepository } from '../../common/database/application/applications.repository';
import { RolesRepository } from '../../common/database/role/roles.repository';
import { UserAppEntity } from '../../common/database/user-application/user-app.entity';
import { UserAppsRepository } from '../../common/database/user-application/user-apps.repository';
import { UserRoleEntity } from '../../common/database/user-role/user-role.entity';
import { UserRolesRepository } from '../../common/database/user-role/user-roles.repository';
import { AssignApplicationDto } from '../../common/dto/assign-application.dto';
import { AssignRoleDto } from '../../common/dto/assign-role.dto';
import { ConnectionResponse } from '../../common/dto/connection-response.dto';
import { CreateConnectionDto } from '../../common/dto/create-connection.dto';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { CreateAppUserDto } from './dto/create-app-user.dto';
import { AppUserMapper } from './app-user.mapper';
import { AppUserCreatedResponse } from './dto/app-user-created-response.dto';
import { AppUserResponse } from './dto/app-user-response.dto';
import { AppUserApplicationRolesResponse } from './dto/app-user-application-roles-response.dto';
import { CredentialGenerator } from './credential-generator';

const BCRYPT_SALT_ROUNDS = 10;

const APP_USER_NOT_FOUND_MESSAGE = 'Application user not found';
const APPLICATION_NOT_FOUND_MESSAGE = 'Application not found';
const ROLE_NOT_FOUND_MESSAGE = 'Role not found';
const APPLICATION_ALREADY_ASSIGNED_MESSAGE =
  'Application already assigned to this user';
const ROLE_ALREADY_ASSIGNED_MESSAGE = 'Role already assigned to this user';
const SAME_ORIGIN_AND_DESTINATION_MESSAGE =
  'Origin and destination applications must be different';
const APPLICATION_NOT_ASSIGNED_MESSAGE =
  'The user does not have this application assigned';
const CONNECTION_ALREADY_EXISTS_MESSAGE =
  'This connection already exists for the user';

@Injectable()
export class AppUsersService {
  constructor(
    private readonly appUsersRepository: AppUsersRepository,
    private readonly applicationsRepository: ApplicationsRepository,
    private readonly rolesRepository: RolesRepository,
    private readonly userAppsRepository: UserAppsRepository,
    private readonly userRolesRepository: UserRolesRepository,
    private readonly appUserConnectionsRepository: AppUserConnectionsRepository,
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

  async findAssignedApplications(
    userId: number,
  ): Promise<ResponseBody<AppUserApplicationRolesResponse[]>> {
    const appUser = await this.appUsersRepository.findById(userId);
    if (!appUser) {
      throw new NotFoundException(APP_USER_NOT_FOUND_MESSAGE);
    }

    const userApps = await this.userAppsRepository.findAllByAppUserId(userId);
    const userRoles = await this.userRolesRepository.findAllByAppUserId(userId);

    // A role assignment (apps_users_roles) grants real access on its own —
    // it's what login and downstream RolesGuards actually check — so an
    // application must show up here even if it was only ever assigned
    // through assignRole() and never went through assignApplication().
    const applicationIds = new Set([
      ...userApps.map((userApp) => userApp.applicationId),
      ...userRoles.map((userRole) => userRole.applicationId),
    ]);
    const applications = await this.applicationsRepository.findByIds([
      ...applicationIds,
    ]);

    const roles = await this.rolesRepository.findByIds(
      userRoles.map((userRole) => userRole.roleId),
    );

    const data = applications.map((application) => ({
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

    return ResponseBody.builder<AppUserApplicationRolesResponse[]>()
      .withMsg('Assigned applications retrieved successfully')
      .withData(data)
      .build();
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

  async findConnections(
    userId: number,
  ): Promise<ResponseBody<ConnectionResponse[]>> {
    const appUser = await this.appUsersRepository.findById(userId);
    if (!appUser) {
      throw new NotFoundException(APP_USER_NOT_FOUND_MESSAGE);
    }

    const connections =
      await this.appUserConnectionsRepository.findAllByAppUserId(userId);

    return ResponseBody.builder<ConnectionResponse[]>()
      .withMsg('Connections retrieved successfully')
      .withData(await this.toConnectionResponses(connections))
      .build();
  }

  async createConnection(
    userId: number,
    dto: CreateConnectionDto,
  ): Promise<ResponseBody<ConnectionResponse>> {
    const appUser = await this.appUsersRepository.findById(userId);
    if (!appUser) {
      throw new NotFoundException(APP_USER_NOT_FOUND_MESSAGE);
    }

    if (dto.originApplicationId === dto.destinationApplicationId) {
      throw new BadRequestException(SAME_ORIGIN_AND_DESTINATION_MESSAGE);
    }

    const applications = await this.applicationsRepository.findByIds([
      dto.originApplicationId,
      dto.destinationApplicationId,
    ]);
    if (applications.length !== 2) {
      throw new NotFoundException(APPLICATION_NOT_FOUND_MESSAGE);
    }

    for (const applicationId of [
      dto.originApplicationId,
      dto.destinationApplicationId,
    ]) {
      const isAssigned =
        await this.userAppsRepository.existsForAppUserAndApplication(
          userId,
          applicationId,
        );
      if (!isAssigned) {
        throw new BadRequestException(APPLICATION_NOT_ASSIGNED_MESSAGE);
      }
    }

    const alreadyExists =
      await this.appUserConnectionsRepository.existsForAppUserAndApplications(
        userId,
        dto.originApplicationId,
        dto.destinationApplicationId,
      );
    if (alreadyExists) {
      throw new ConflictException(CONNECTION_ALREADY_EXISTS_MESSAGE);
    }

    const entity = new AppUserConnectionEntity();
    entity.appUserId = userId;
    entity.originApplicationId = dto.originApplicationId;
    entity.destinationApplicationId = dto.destinationApplicationId;
    const created =
      await this.appUserConnectionsRepository.createConnection(entity);

    const [response] = await this.toConnectionResponses([created]);
    return ResponseBody.builder<ConnectionResponse>()
      .withMsg('Connection created successfully')
      .withData(response)
      .build();
  }

  private async toConnectionResponses(
    connections: AppUserConnectionEntity[],
  ): Promise<ConnectionResponse[]> {
    const applicationIds = [
      ...new Set(
        connections.flatMap((connection) => [
          connection.originApplicationId,
          connection.destinationApplicationId,
        ]),
      ),
    ];
    const applications =
      await this.applicationsRepository.findByIds(applicationIds);
    const namesById = new Map(
      applications.map((application) => [application.id, application.name]),
    );

    return connections.map((connection) => ({
      id: connection.id,
      originApplicationId: connection.originApplicationId,
      originApplicationName: namesById.get(connection.originApplicationId)!,
      destinationApplicationId: connection.destinationApplicationId,
      destinationApplicationName: namesById.get(
        connection.destinationApplicationId,
      )!,
    }));
  }
}
