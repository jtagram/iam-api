import {
	BadRequestException,
	ConflictException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ApplicationsRepository } from '../../common/database/application/applications.repository';
import { InternalUserEntity } from '../../common/database/internal-user/internal-user.entity';
import { InternalUsersRepository } from '../../common/database/internal-user/internal-users.repository';
import { RolesRepository } from '../../common/database/role/roles.repository';
import { AssignApplicationDto } from '../../common/dto/assign-application.dto';
import { AssignRoleDto } from '../../common/dto/assign-role.dto';
import { CreateConnectionDto } from '../../common/dto/create-connection.dto';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { CreateInternalUserDto } from './dto/create-internal-user.dto';
import { InternalUserResponse } from './dto/internal-user-response.dto';
import { FindInternalUsersByRoleDto } from './dto/find-internal-users-by-role.dto';
import { InternalUserMapper } from './internal-user.mapper';

const BCRYPT_SALT_ROUNDS = 10;

const INTERNAL_USER_NOT_FOUND_MESSAGE = 'Internal user not found';
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
const INTERNAL_USER_EMAIL_ALREADY_EXISTS_MESSAGE = 'Email already in use';
const CONNECTION_ALREADY_EXISTS_MESSAGE = 'This connection already exists for the user';

@Injectable()
export class InternalUsersService {
	constructor(
		private readonly internalUsersRepository: InternalUsersRepository,
		private readonly applicationsRepository: ApplicationsRepository,
		private readonly rolesRepository: RolesRepository,
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
		const roleNames = dto.roles
			.split(',')
			.map((name) => name.trim())
			.filter((name) => name.length > 0);
		const internalUsers = await this.internalUsersRepository.findByApplicationAndRoleNames(
			dto.applicationName,
			roleNames,
		);

		return InternalUserMapper.toFindAllResponse(internalUsers);
	}

	async findAssignedApplications(userId: number): Promise<ResponseBody<InternalUserEntity>> {
		const internalUser = await this.internalUsersRepository.findByIdWithAssignments(userId);
		if (!internalUser) {
			throw new NotFoundException(INTERNAL_USER_NOT_FOUND_MESSAGE);
		}

		return InternalUserMapper.toFindAssignedApplicationsResponse(internalUser);
	}

	async findAllWithApplications(): Promise<ResponseBody<InternalUserEntity[]>> {
		const internalUsers =
			await this.internalUsersRepository.findAllWithApplicationsOrderedByCreatedAtDesc();

		return InternalUserMapper.toFindAllWithApplicationsResponse(internalUsers);
	}

	async assignApplication(
		userId: number,
		dto: AssignApplicationDto,
	): Promise<ResponseBody<InternalUserEntity>> {
		const internalUser = await this.internalUsersRepository.findById(userId);
		
		if (!internalUser) {
			throw new NotFoundException(INTERNAL_USER_NOT_FOUND_MESSAGE);
		}

		const application = await this.applicationsRepository.findById(dto.applicationId);
		
		if (!application) {
			throw new NotFoundException(APPLICATION_NOT_FOUND_MESSAGE);
		}

		const alreadyAssigned = await this.internalUsersRepository.hasApplication(
			userId,
			dto.applicationId,
		);
		
		if (alreadyAssigned) {
			throw new ConflictException(APPLICATION_ALREADY_ASSIGNED_MESSAGE);
		}

		const entity = InternalUserMapper.toApplicationAssignmentEntity(userId, dto.applicationId);
		
		await this.internalUsersRepository.addApplication(entity);

		const internalUserWithAssignments =
			await this.internalUsersRepository.findByIdWithAssignments(userId);
		
			if (!internalUserWithAssignments) {
			throw new NotFoundException(INTERNAL_USER_NOT_FOUND_MESSAGE);
		}

		return InternalUserMapper.toAssignApplicationResponse(internalUserWithAssignments);
	}

	async assignRole(userId: number, dto: AssignRoleDto): Promise<ResponseBody<InternalUserEntity>> {
		const internalUser = await this.internalUsersRepository.findById(userId);
		
		if (!internalUser) {
			throw new NotFoundException(INTERNAL_USER_NOT_FOUND_MESSAGE);
		}

		const role = await this.rolesRepository.findById(dto.roleId);
		
		if (!role) {
			throw new NotFoundException(ROLE_NOT_FOUND_MESSAGE);
		}

		const applicationAssignment = await this.internalUsersRepository.findApplicationAssignment(
			userId,
			role.applicationId,
		);
		
		if (!applicationAssignment) {
			throw new ConflictException(ROLE_APPLICATION_NOT_ASSIGNED_MESSAGE);
		}

		const alreadyAssigned = await this.internalUsersRepository.hasRole(userId, dto.roleId);
		
		if (alreadyAssigned) {
			throw new ConflictException(ROLE_ALREADY_ASSIGNED_MESSAGE);
		}

		const entity = InternalUserMapper.toRoleAssignmentEntity(applicationAssignment.id, dto.roleId);
		
		await this.internalUsersRepository.addRole(entity);

		const internalUserWithAssignments =
			await this.internalUsersRepository.findByIdWithAssignments(userId);
		
		if (!internalUserWithAssignments) {
			throw new NotFoundException(INTERNAL_USER_NOT_FOUND_MESSAGE);
		}

		return InternalUserMapper.toAssignRoleResponse(internalUserWithAssignments);
	}

	async findConnections(userId: number): Promise<ResponseBody<InternalUserEntity>> {
		const internalUser = await this.internalUsersRepository.findByIdWithConnections(userId);
		
		if (!internalUser) {
			throw new NotFoundException(INTERNAL_USER_NOT_FOUND_MESSAGE);
		}

		return InternalUserMapper.toFindConnectionsResponse(internalUser);
	}

	async createConnection(
		userId: number,
		dto: CreateConnectionDto,
	): Promise<ResponseBody<InternalUserEntity>> {
		const internalUser = await this.internalUsersRepository.findById(userId);
		
		if (!internalUser) {
			throw new NotFoundException(INTERNAL_USER_NOT_FOUND_MESSAGE);
		}

		if (dto.originApplicationId === dto.destinationApplicationId) {
			throw new BadRequestException(SAME_ORIGIN_AND_DESTINATION_MESSAGE);
		}

		const originAssignment = await this.internalUsersRepository.findApplicationAssignment(
			userId,
			dto.originApplicationId,
		);
		
		if (!originAssignment) {
			throw new BadRequestException(ORIGIN_APPLICATION_NOT_ASSIGNED_MESSAGE);
		}

		const destinationAssignment = await this.internalUsersRepository.findApplicationAssignment(
			userId,
			dto.destinationApplicationId,
		);
		
		if (!destinationAssignment) {
			throw new BadRequestException(DESTINATION_APPLICATION_NOT_ASSIGNED_MESSAGE);
		}

		const alreadyExists = await this.internalUsersRepository.hasConnection(
			userId,
			dto.originApplicationId,
			dto.destinationApplicationId,
		);
		
		if (alreadyExists) {
			throw new ConflictException(CONNECTION_ALREADY_EXISTS_MESSAGE);
		}

		const connection = InternalUserMapper.toConnectionEntity(userId, dto);
		
		const created = await this.internalUsersRepository.addConnection(connection);

		const internalUserWithConnection = await this.internalUsersRepository.findByIdWithConnection(
			userId,
			created.id,
		);
		
		if (!internalUserWithConnection) {
			throw new NotFoundException(INTERNAL_USER_NOT_FOUND_MESSAGE);
		}

		return InternalUserMapper.toCreateConnectionResponse(internalUserWithConnection);
	}
}
