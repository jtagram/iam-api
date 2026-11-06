import {
	BadRequestException,
	ConflictException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AppUserEntity } from '../../common/database/app-user/app-user.entity';
import { AppUsersRepository } from '../../common/database/app-user/app-users.repository';
import { ApplicationsRepository } from '../../common/database/application/applications.repository';
import { RolesRepository } from '../../common/database/role/roles.repository';
import { AssignApplicationDto } from '../../common/dto/assign-application.dto';
import { AssignRoleDto } from '../../common/dto/assign-role.dto';
import { CreateConnectionDto } from '../../common/dto/create-connection.dto';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { CreateAppUserDto } from './dto/create-app-user.dto';
import { AppUserMapper } from './app-user.mapper';
import { AppUserCreatedResponse } from './dto/app-user-created-response.dto';
import { AppUserResponse } from './dto/app-user-response.dto';
import { CredentialGenerator } from './credential-generator';

const BCRYPT_SALT_ROUNDS = 10;

const APP_USER_NAME_ALREADY_EXISTS_MESSAGE = 'An application user with this name already exists';
const APP_USER_NOT_FOUND_MESSAGE = 'Application user not found';
const APPLICATION_NOT_FOUND_MESSAGE = 'Application not found';
const ROLE_NOT_FOUND_MESSAGE = 'Role not found';
const APPLICATION_ALREADY_ASSIGNED_MESSAGE = 'Application already assigned to this user';
const ROLE_ALREADY_ASSIGNED_MESSAGE = 'Role already assigned to this user';
const ROLE_APPLICATION_NOT_ASSIGNED_MESSAGE = 'Application is not assigned to the user';
const SAME_ORIGIN_AND_DESTINATION_MESSAGE = 'Origin and destination applications must be different';
const ORIGIN_APPLICATION_NOT_ASSIGNED_MESSAGE =
	'The user does not have the origin application assigned';
const DESTINATION_APPLICATION_NOT_ASSIGNED_MESSAGE =
	'The user does not have the destination application assigned';
const CONNECTION_ALREADY_EXISTS_MESSAGE = 'This connection already exists for the user';

@Injectable()
export class AppUsersService {
	constructor(
		private readonly appUsersRepository: AppUsersRepository,
		private readonly applicationsRepository: ApplicationsRepository,
		private readonly rolesRepository: RolesRepository,
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

	async findAssignedApplications(userId: number): Promise<ResponseBody<AppUserEntity>> {
		const appUser = await this.appUsersRepository.findByIdWithAssignments(userId);

		if (!appUser) {
			throw new NotFoundException(APP_USER_NOT_FOUND_MESSAGE);
		}

		return AppUserMapper.toFindAssignedApplicationsResponse(appUser);
	}

	async assignApplication(
		userId: number,
		dto: AssignApplicationDto,
	): Promise<ResponseBody<AppUserEntity>> {
		const appUser = await this.appUsersRepository.findById(userId);

		if (!appUser) {
			throw new NotFoundException(APP_USER_NOT_FOUND_MESSAGE);
		}

		const application = await this.applicationsRepository.findById(dto.applicationId);

		if (!application) {
			throw new NotFoundException(APPLICATION_NOT_FOUND_MESSAGE);
		}

		const alreadyAssigned = await this.appUsersRepository.hasApplication(userId, dto.applicationId);

		if (alreadyAssigned) {
			throw new ConflictException(APPLICATION_ALREADY_ASSIGNED_MESSAGE);
		}

		const entity = AppUserMapper.toApplicationAssignmentEntity(userId, dto.applicationId);

		await this.appUsersRepository.addApplication(entity);

		const appUserWithAssignments = await this.appUsersRepository.findByIdWithAssignments(userId);

		if (!appUserWithAssignments) {
			throw new NotFoundException(APP_USER_NOT_FOUND_MESSAGE);
		}

		return AppUserMapper.toAssignApplicationResponse(appUserWithAssignments);
	}

	async assignRole(userId: number, dto: AssignRoleDto): Promise<ResponseBody<AppUserEntity>> {
		const appUser = await this.appUsersRepository.findById(userId);

		if (!appUser) {
			throw new NotFoundException(APP_USER_NOT_FOUND_MESSAGE);
		}

		const role = await this.rolesRepository.findById(dto.roleId);

		if (!role) {
			throw new NotFoundException(ROLE_NOT_FOUND_MESSAGE);
		}

		const applicationAssignment = await this.appUsersRepository.findApplicationAssignment(
			userId,
			role.applicationId,
		);

		if (!applicationAssignment) {
			throw new ConflictException(ROLE_APPLICATION_NOT_ASSIGNED_MESSAGE);
		}

		const alreadyAssigned = await this.appUsersRepository.hasRole(userId, dto.roleId);

		if (alreadyAssigned) {
			throw new ConflictException(ROLE_ALREADY_ASSIGNED_MESSAGE);
		}

		const entity = AppUserMapper.toRoleAssignmentEntity(applicationAssignment.id, dto.roleId);

		await this.appUsersRepository.addRole(entity);

		const appUserWithAssignments = await this.appUsersRepository.findByIdWithAssignments(userId);

		if (!appUserWithAssignments) {
			throw new NotFoundException(APP_USER_NOT_FOUND_MESSAGE);
		}

		return AppUserMapper.toAssignRoleResponse(appUserWithAssignments);
	}

	async findConnections(userId: number): Promise<ResponseBody<AppUserEntity>> {
		const appUser = await this.appUsersRepository.findByIdWithConnections(userId);

		if (!appUser) {
			throw new NotFoundException(APP_USER_NOT_FOUND_MESSAGE);
		}

		return AppUserMapper.toFindConnectionsResponse(appUser);
	}

	async createConnection(
		userId: number,
		dto: CreateConnectionDto,
	): Promise<ResponseBody<AppUserEntity>> {
		const appUser = await this.appUsersRepository.findById(userId);
		if (!appUser) {
			throw new NotFoundException(APP_USER_NOT_FOUND_MESSAGE);
		}

		if (dto.originApplicationId === dto.destinationApplicationId) {
			throw new BadRequestException(SAME_ORIGIN_AND_DESTINATION_MESSAGE);
		}

		const originAssignment = await this.appUsersRepository.findApplicationAssignment(
			userId,
			dto.originApplicationId,
		);

		if (!originAssignment) {
			throw new BadRequestException(ORIGIN_APPLICATION_NOT_ASSIGNED_MESSAGE);
		}

		const destinationAssignment = await this.appUsersRepository.findApplicationAssignment(
			userId,
			dto.destinationApplicationId,
		);

		if (!destinationAssignment) {
			throw new BadRequestException(DESTINATION_APPLICATION_NOT_ASSIGNED_MESSAGE);
		}

		const alreadyExists = await this.appUsersRepository.hasConnection(
			userId,
			dto.originApplicationId,
			dto.destinationApplicationId,
		);

		if (alreadyExists) {
			throw new ConflictException(CONNECTION_ALREADY_EXISTS_MESSAGE);
		}

		const connection = AppUserMapper.toConnectionEntity(userId, dto);

		const created = await this.appUsersRepository.addConnection(connection);

		const appUserWithConnection = await this.appUsersRepository.findByIdWithConnection(
			userId,
			created.id,
		);

		if (!appUserWithConnection) {
			throw new NotFoundException(APP_USER_NOT_FOUND_MESSAGE);
		}

		return AppUserMapper.toCreateConnectionResponse(appUserWithConnection);
	}

	private hashSecret(secret: string): Promise<string> {
		return bcrypt.hash(secret, BCRYPT_SALT_ROUNDS);
	}
}
