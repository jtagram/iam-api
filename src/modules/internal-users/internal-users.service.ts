import {
	BadRequestException,
	ConflictException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ApplicationsRepository } from '../../common/database/application/applications.repository';
import { InternalUserConnectionsRepository } from '../../common/database/internal-user-connection/internal-user-connections.repository';
import { InternalUserAppsRepository } from '../../common/database/internal-user/internal-user-apps.repository';
import { InternalUserRolesRepository } from '../../common/database/internal-user/internal-user-roles.repository';
import { InternalUsersRepository } from '../../common/database/internal-user/internal-users.repository';
import { RolesRepository } from '../../common/database/role/roles.repository';
import { AssignApplicationDto } from '../../common/dto/assign-application.dto';
import { AssignRoleDto } from '../../common/dto/assign-role.dto';
import { ConnectionResponse } from '../../common/dto/connection-response.dto';
import { CreateConnectionDto } from '../../common/dto/create-connection.dto';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { CreateInternalUserDto } from './dto/create-internal-user.dto';
import { InternalUserApplicationAssignmentResponse } from './dto/internal-user-application-assignment-response.dto';
import { InternalUserRoleAssignmentResponse } from './dto/internal-user-role-assignment-response.dto';
import { InternalUserResponse } from './dto/internal-user-response.dto';
import { InternalUserApplicationRolesResponse } from './dto/internal-user-application-roles-response.dto';
import { FindInternalUsersByRoleDto } from './dto/find-internal-users-by-role.dto';
import { InternalUserMapper } from './internal-user.mapper';

const BCRYPT_SALT_ROUNDS = 10;

const INTERNAL_USER_NOT_FOUND_MESSAGE = 'Internal user not found';
const APPLICATION_NOT_FOUND_MESSAGE = 'Application not found';
const ROLE_NOT_FOUND_MESSAGE = 'Role not found';
const APPLICATION_ALREADY_ASSIGNED_MESSAGE = 'Application already assigned to this user';
const ROLE_ALREADY_ASSIGNED_MESSAGE = 'Role already assigned to this user';
const SAME_ORIGIN_AND_DESTINATION_MESSAGE = 'Origin and destination applications must be different';
const APPLICATION_NOT_ASSIGNED_MESSAGE = 'The user does not have this application assigned';
const INTERNAL_USER_EMAIL_ALREADY_EXISTS_MESSAGE = 'Email already in use';
const CONNECTION_ALREADY_EXISTS_MESSAGE = 'This connection already exists for the user';

@Injectable()
export class InternalUsersService {
	constructor(
		private readonly internalUsersRepository: InternalUsersRepository,
		private readonly applicationsRepository: ApplicationsRepository,
		private readonly rolesRepository: RolesRepository,
		private readonly internalUserAppsRepository: InternalUserAppsRepository,
		private readonly internalUserRolesRepository: InternalUserRolesRepository,
		private readonly internalUserConnectionsRepository: InternalUserConnectionsRepository,
	) {}

	async create(dto: CreateInternalUserDto): Promise<ResponseBody<InternalUserResponse>> {
		const existing = await this.internalUsersRepository.findByEmail(dto.email);
		if (existing) {
			throw new ConflictException(INTERNAL_USER_EMAIL_ALREADY_EXISTS_MESSAGE);
		}

		const hashedPassword = await this.hashPassword(dto.password);
		const internalUserEntity = InternalUserMapper.toEntity(dto, hashedPassword);
		const createdInternalUser =
			await this.internalUsersRepository.createInternalUser(internalUserEntity);

		return InternalUserMapper.toCreateResponse(createdInternalUser);
	}

	async findAll(): Promise<ResponseBody<InternalUserResponse[]>> {
		const internalUsers = await this.internalUsersRepository.findAllOrderedByCreatedAtDesc();
		return InternalUserMapper.toFindAllResponse(internalUsers);
	}

	private hashPassword(password: string): Promise<string> {
		return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
	}

	async findByApplicationAndRoles(
		dto: FindInternalUsersByRoleDto,
	): Promise<ResponseBody<InternalUserResponse[]>> {
		const application = await this.applicationsRepository.findByName(dto.applicationName);
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

		const internalUserIds = await this.internalUserRolesRepository.findInternalUserIdsByRoleIds(
			roles.map((role) => role.id),
		);
		const internalUsers = await this.internalUsersRepository.findByIds(internalUserIds);

		return InternalUserMapper.toFindAllResponse(internalUsers);
	}

	async findAssignedApplications(
		userId: number,
	): Promise<ResponseBody<InternalUserApplicationRolesResponse[]>> {
		const internalUser = await this.internalUsersRepository.findById(userId);
		if (!internalUser) {
			throw new NotFoundException(INTERNAL_USER_NOT_FOUND_MESSAGE);
		}

		const internalUserApps = await this.internalUserAppsRepository.findAllByInternalUserId(userId);
		const internalUserRoles =
			await this.internalUserRolesRepository.findAllByInternalUserId(userId);
		const roles = await this.rolesRepository.findByIds(
			internalUserRoles.map((internalUserRole) => internalUserRole.roleId),
		);

		// An application must show up here whether it came from
		// assignApplication() (internal_users_applications) or from
		// assignRole() (internal_users_roles) alone — either one is a real
		// assignment on its own.
		const applicationIds = [
			...new Set([
				...internalUserApps.map((internalUserApp) => internalUserApp.applicationId),
				...internalUserRoles.map((internalUserRole) => internalUserRole.applicationId),
			]),
		];
		const applications = await this.applicationsRepository.findByIds(applicationIds);

		const assignedApplications = applications.map((application) => ({
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

		return InternalUserMapper.toFindAssignedApplicationsResponse(assignedApplications);
	}

	async assignApplication(
		userId: number,
		dto: AssignApplicationDto,
	): Promise<ResponseBody<InternalUserApplicationAssignmentResponse>> {
		const internalUser = await this.internalUsersRepository.findById(userId);
		if (!internalUser) {
			throw new NotFoundException(INTERNAL_USER_NOT_FOUND_MESSAGE);
		}

		const application = await this.applicationsRepository.findById(dto.applicationId);
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

		const entity = InternalUserMapper.toApplicationAssignmentEntity(userId, dto.applicationId);
		const created = await this.internalUserAppsRepository.createAssignment(entity);
		return InternalUserMapper.toAssignApplicationResponse(created);
	}

	async assignRole(
		userId: number,
		dto: AssignRoleDto,
	): Promise<ResponseBody<InternalUserRoleAssignmentResponse>> {
		const internalUser = await this.internalUsersRepository.findById(userId);
		if (!internalUser) {
			throw new NotFoundException(INTERNAL_USER_NOT_FOUND_MESSAGE);
		}

		const role = await this.rolesRepository.findById(dto.roleId);
		if (!role) {
			throw new NotFoundException(ROLE_NOT_FOUND_MESSAGE);
		}

		const alreadyAssigned = await this.internalUserRolesRepository.existsForInternalUserAndRole(
			userId,
			dto.roleId,
		);
		if (alreadyAssigned) {
			throw new ConflictException(ROLE_ALREADY_ASSIGNED_MESSAGE);
		}

		const entity = InternalUserMapper.toRoleAssignmentEntity(
			userId,
			dto.roleId,
			role.applicationId,
		);
		const created = await this.internalUserRolesRepository.createAssignment(entity);
		return InternalUserMapper.toAssignRoleResponse(created);
	}

	async findConnections(userId: number): Promise<ResponseBody<ConnectionResponse[]>> {
		const internalUser = await this.internalUsersRepository.findById(userId);
		if (!internalUser) {
			throw new NotFoundException(INTERNAL_USER_NOT_FOUND_MESSAGE);
		}

		const connections =
			await this.internalUserConnectionsRepository.findAllByInternalUserIdOrderedByCreatedAtDesc(
				userId,
			);
		const applications = await this.applicationsRepository.findByIds(
			InternalUserMapper.toApplicationIds(connections),
		);

		return InternalUserMapper.toFindConnectionsResponse(
			InternalUserMapper.toConnectionResponses(connections, applications),
		);
	}

	async createConnection(
		userId: number,
		dto: CreateConnectionDto,
	): Promise<ResponseBody<ConnectionResponse>> {
		const internalUser = await this.internalUsersRepository.findById(userId);
		if (!internalUser) {
			throw new NotFoundException(INTERNAL_USER_NOT_FOUND_MESSAGE);
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

		const alreadyExists =
			await this.internalUserConnectionsRepository.existsForInternalUserAndApplications(
				userId,
				dto.originApplicationId,
				dto.destinationApplicationId,
			);
		if (alreadyExists) {
			throw new ConflictException(CONNECTION_ALREADY_EXISTS_MESSAGE);
		}

		const created = await this.internalUserConnectionsRepository.createConnection(
			InternalUserMapper.toConnectionEntity(userId, dto),
		);

		return InternalUserMapper.toCreateConnectionResponse(
			InternalUserMapper.toConnectionResponse(created, applications),
		);
	}

	private async assertApplicationsAssigned(
		userId: number,
		applicationIds: number[],
	): Promise<void> {
		const assignments = await Promise.all(
			applicationIds.map((applicationId) =>
				this.internalUserAppsRepository.existsForInternalUserAndApplication(userId, applicationId),
			),
		);
		if (assignments.some((isAssigned) => !isAssigned)) {
			throw new BadRequestException(APPLICATION_NOT_ASSIGNED_MESSAGE);
		}
	}
}
