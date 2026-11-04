import {
	BadRequestException,
	ConflictException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AppUserConnectionsRepository } from '../../common/database/app-user-connection/app-user-connections.repository';
import { AppUsersRepository } from '../../common/database/app-user/app-users.repository';
import { ApplicationsRepository } from '../../common/database/application/applications.repository';
import { RolesRepository } from '../../common/database/role/roles.repository';
import { UserAppsRepository } from '../../common/database/user-application/user-apps.repository';
import { UserRolesRepository } from '../../common/database/user-role/user-roles.repository';
import { AssignApplicationDto } from '../../common/dto/assign-application.dto';
import { AssignRoleDto } from '../../common/dto/assign-role.dto';
import { ConnectionResponse } from '../../common/dto/connection-response.dto';
import { CreateConnectionDto } from '../../common/dto/create-connection.dto';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { CreateAppUserDto } from './dto/create-app-user.dto';
import { AppUserMapper } from './app-user.mapper';
import { AppUserApplicationAssignmentResponse } from './dto/app-user-application-assignment-response.dto';
import { AppUserRoleAssignmentResponse } from './dto/app-user-role-assignment-response.dto';
import { AppUserCreatedResponse } from './dto/app-user-created-response.dto';
import { AppUserResponse } from './dto/app-user-response.dto';
import { AppUserApplicationRolesResponse } from './dto/app-user-application-roles-response.dto';
import { CredentialGenerator } from './credential-generator';

const BCRYPT_SALT_ROUNDS = 10;

const APP_USER_NAME_ALREADY_EXISTS_MESSAGE = 'An application user with this name already exists';
const APP_USER_NOT_FOUND_MESSAGE = 'Application user not found';
const APPLICATION_NOT_FOUND_MESSAGE = 'Application not found';
const ROLE_NOT_FOUND_MESSAGE = 'Role not found';
const APPLICATION_ALREADY_ASSIGNED_MESSAGE = 'Application already assigned to this user';
const ROLE_ALREADY_ASSIGNED_MESSAGE = 'Role already assigned to this user';
const SAME_ORIGIN_AND_DESTINATION_MESSAGE = 'Origin and destination applications must be different';
const APPLICATION_NOT_ASSIGNED_MESSAGE = 'The user does not have this application assigned';
const CONNECTION_ALREADY_EXISTS_MESSAGE = 'This connection already exists for the user';

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

	async create(dto: CreateAppUserDto): Promise<ResponseBody<AppUserCreatedResponse>> {
		const existingAppUser = await this.appUsersRepository.findByName(dto.name);
		if (existingAppUser) {
			throw new ConflictException(APP_USER_NAME_ALREADY_EXISTS_MESSAGE);
		}

		const clienteId = CredentialGenerator.generateClienteId();
		const plaintextClienteSecret = CredentialGenerator.generateClienteSecret();
		const hashedClienteSecret = await this.hashSecret(plaintextClienteSecret);

		const appUserEntity = AppUserMapper.toEntity(dto, clienteId, hashedClienteSecret);
		const createdAppUser = await this.appUsersRepository.createAppUser(appUserEntity);

		return AppUserMapper.toCreateResponse(createdAppUser, plaintextClienteSecret);
	}

	async findAll(): Promise<ResponseBody<AppUserResponse[]>> {
		const appUsers = await this.appUsersRepository.findAllOrderedByCreatedAtDesc();

		return AppUserMapper.toFindAllResponse(appUsers);
	}

	private hashSecret(secret: string): Promise<string> {
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

		const applicationIds = new Set([
			...userApps.map((userApp) => userApp.applicationId),
			...userRoles.map((userRole) => userRole.applicationId),
		]);
		const applications = await this.applicationsRepository.findByIds([...applicationIds]);

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

		return AppUserMapper.toFindAssignedApplicationsResponse(data);
	}

	async assignApplication(
		userId: number,
		dto: AssignApplicationDto,
	): Promise<ResponseBody<AppUserApplicationAssignmentResponse>> {
		const appUser = await this.appUsersRepository.findById(userId);
		if (!appUser) {
			throw new NotFoundException(APP_USER_NOT_FOUND_MESSAGE);
		}

		const application = await this.applicationsRepository.findById(dto.applicationId);
		if (!application) {
			throw new NotFoundException(APPLICATION_NOT_FOUND_MESSAGE);
		}

		const alreadyAssigned = await this.userAppsRepository.existsForAppUserAndApplication(
			userId,
			dto.applicationId,
		);
		if (alreadyAssigned) {
			throw new ConflictException(APPLICATION_ALREADY_ASSIGNED_MESSAGE);
		}

		const entity = AppUserMapper.toApplicationAssignmentEntity(userId, dto.applicationId);
		const created = await this.userAppsRepository.createAssignment(entity);

		return AppUserMapper.toAssignApplicationResponse(created);
	}

	async assignRole(
		userId: number,
		dto: AssignRoleDto,
	): Promise<ResponseBody<AppUserRoleAssignmentResponse>> {
		const appUser = await this.appUsersRepository.findById(userId);
		if (!appUser) {
			throw new NotFoundException(APP_USER_NOT_FOUND_MESSAGE);
		}

		const role = await this.rolesRepository.findById(dto.roleId);
		if (!role) {
			throw new NotFoundException(ROLE_NOT_FOUND_MESSAGE);
		}

		const alreadyAssigned = await this.userRolesRepository.existsForAppUserAndRole(
			userId,
			dto.roleId,
		);
		if (alreadyAssigned) {
			throw new ConflictException(ROLE_ALREADY_ASSIGNED_MESSAGE);
		}

		const entity = AppUserMapper.toRoleAssignmentEntity(userId, dto.roleId, role.applicationId);
		const created = await this.userRolesRepository.createAssignment(entity);

		return AppUserMapper.toAssignRoleResponse(created);
	}

	async findConnections(userId: number): Promise<ResponseBody<ConnectionResponse[]>> {
		const appUser = await this.appUsersRepository.findById(userId);
		if (!appUser) {
			throw new NotFoundException(APP_USER_NOT_FOUND_MESSAGE);
		}

		const connections =
			await this.appUserConnectionsRepository.findAllByAppUserIdOrderedByCreatedAtDesc(userId);
		const applications = await this.applicationsRepository.findByIds(
			AppUserMapper.toApplicationIds(connections),
		);

		return AppUserMapper.toFindConnectionsResponse(
			AppUserMapper.toConnectionResponses(connections, applications),
		);
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

		await this.assertApplicationsAssigned(userId, [
			dto.originApplicationId,
			dto.destinationApplicationId,
		]);

		const alreadyExists = await this.appUserConnectionsRepository.existsForAppUserAndApplications(
			userId,
			dto.originApplicationId,
			dto.destinationApplicationId,
		);
		if (alreadyExists) {
			throw new ConflictException(CONNECTION_ALREADY_EXISTS_MESSAGE);
		}

		const created = await this.appUserConnectionsRepository.createConnection(
			AppUserMapper.toConnectionEntity(userId, dto),
		);

		return AppUserMapper.toCreateConnectionResponse(
			AppUserMapper.toConnectionResponse(created, applications),
		);
	}

	private async assertApplicationsAssigned(
		userId: number,
		applicationIds: number[],
	): Promise<void> {
		const assignments = await Promise.all(
			applicationIds.map((applicationId) =>
				this.userAppsRepository.existsForAppUserAndApplication(userId, applicationId),
			),
		);
		if (assignments.some((isAssigned) => !isAssigned)) {
			throw new BadRequestException(APPLICATION_NOT_ASSIGNED_MESSAGE);
		}
	}
}
