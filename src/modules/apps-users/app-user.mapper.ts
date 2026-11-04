import { AppUserConnectionEntity } from '../../common/database/app-user-connection/app-user-connection.entity';
import { AppUserEntity } from '../../common/database/app-user/app-user.entity';
import { ApplicationEntity } from '../../common/database/application/application.entity';
import { UserAppEntity } from '../../common/database/user-application/user-app.entity';
import { UserRoleEntity } from '../../common/database/user-role/user-role.entity';
import { ConnectionResponse } from '../../common/dto/connection-response.dto';
import { CreateConnectionDto } from '../../common/dto/create-connection.dto';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { ResponseLogin } from '../../common/dto/response-login.dto';
import { CreateAppUserDto } from './dto/create-app-user.dto';
import { AppUserApplicationAssignmentResponse } from './dto/app-user-application-assignment-response.dto';
import { AppUserRoleAssignmentResponse } from './dto/app-user-role-assignment-response.dto';
import { AppUserCreatedResponse } from './dto/app-user-created-response.dto';
import { AppUserResponse } from './dto/app-user-response.dto';
import { AppUserApplicationRolesResponse } from './dto/app-user-application-roles-response.dto';

const APP_USER_CREATED_MESSAGE =
	'Application user created successfully — store clienteSecret now, it cannot be retrieved again';
const APP_USERS_RETRIEVED_MESSAGE = 'Application users retrieved successfully';
const ASSIGNED_APPLICATIONS_RETRIEVED_MESSAGE = 'Assigned applications retrieved successfully';
const APPLICATION_ASSIGNED_MESSAGE = 'Application assigned to user successfully';
const ROLE_ASSIGNED_MESSAGE = 'Role assigned to user successfully';
const CONNECTIONS_RETRIEVED_MESSAGE = 'Connections retrieved successfully';
const CONNECTION_CREATED_MESSAGE = 'Connection created successfully';
const LOGIN_SUCCESSFUL_MESSAGE = 'Login successful';

export class AppUserMapper {
	static toEntity(
		dto: CreateAppUserDto,
		clienteId: string,
		hashedClienteSecret: string,
	): AppUserEntity {
		return AppUserEntity.builder()
			.withClienteId(clienteId)
			.withClienteSecret(hashedClienteSecret)
			.withName(dto.name)
			.withDescription(dto.description)
			.build();
	}

	static toResponseWithSecret(
		appUser: AppUserEntity,
		plaintextClienteSecret: string,
	): AppUserCreatedResponse {
		return {
			id: appUser.id,
			clienteId: appUser.clienteId,
			clienteSecret: plaintextClienteSecret,
			name: appUser.name,
			description: appUser.description,
		};
	}

	static toResponse(appUser: AppUserEntity): AppUserResponse {
		return {
			id: appUser.id,
			clienteId: appUser.clienteId,
			name: appUser.name,
			description: appUser.description,
		};
	}

	static toCreateResponse(
		appUser: AppUserEntity,
		plaintextClienteSecret: string,
	): ResponseBody<AppUserCreatedResponse> {
		return ResponseBody.success(
			APP_USER_CREATED_MESSAGE,
			AppUserMapper.toResponseWithSecret(appUser, plaintextClienteSecret),
		);
	}

	static toFindAllResponse(appUsers: AppUserEntity[]): ResponseBody<AppUserResponse[]> {
		return ResponseBody.success(
			APP_USERS_RETRIEVED_MESSAGE,
			appUsers.map((appUser) => AppUserMapper.toResponse(appUser)),
		);
	}

	static toFindAssignedApplicationsResponse(
		assignedApplications: AppUserApplicationRolesResponse[],
	): ResponseBody<AppUserApplicationRolesResponse[]> {
		return ResponseBody.success(ASSIGNED_APPLICATIONS_RETRIEVED_MESSAGE, assignedApplications);
	}

	static toConnectionEntity(appUserId: number, dto: CreateConnectionDto): AppUserConnectionEntity {
		return Object.assign(new AppUserConnectionEntity(), {
			appUserId,
			originApplicationId: dto.originApplicationId,
			destinationApplicationId: dto.destinationApplicationId,
		});
	}

	static toApplicationIds(connections: AppUserConnectionEntity[]): number[] {
		return [
			...new Set(
				connections.flatMap((connection) => [
					connection.originApplicationId,
					connection.destinationApplicationId,
				]),
			),
		];
	}

	static toConnectionResponse(
		connection: AppUserConnectionEntity,
		applications: ApplicationEntity[],
	): ConnectionResponse {
		return AppUserMapper.buildConnectionResponse(
			connection,
			AppUserMapper.toNamesById(applications),
		);
	}

	static toConnectionResponses(
		connections: AppUserConnectionEntity[],
		applications: ApplicationEntity[],
	): ConnectionResponse[] {
		const namesById = AppUserMapper.toNamesById(applications);
		return connections.map((connection) =>
			AppUserMapper.buildConnectionResponse(connection, namesById),
		);
	}

	private static toNamesById(applications: ApplicationEntity[]): Map<number, string> {
		return new Map(applications.map((application) => [application.id, application.name]));
	}

	// The foreign keys guarantee both applications exist; a missing name stays
	// `undefined`, exactly as the service-built response did before.
	private static buildConnectionResponse(
		connection: AppUserConnectionEntity,
		namesById: Map<number, string>,
	): ConnectionResponse {
		return {
			id: connection.id,
			originApplicationId: connection.originApplicationId,
			originApplicationName: namesById.get(connection.originApplicationId) as string,
			destinationApplicationId: connection.destinationApplicationId,
			destinationApplicationName: namesById.get(connection.destinationApplicationId) as string,
		};
	}

	static toApplicationAssignmentEntity(appUserId: number, applicationId: number): UserAppEntity {
		return Object.assign(new UserAppEntity(), { appUserId, applicationId });
	}

	static toRoleAssignmentEntity(
		appUserId: number,
		roleId: number,
		applicationId: number,
	): UserRoleEntity {
		return Object.assign(new UserRoleEntity(), { appUserId, roleId, applicationId });
	}

	static toApplicationAssignmentResponse(
		assignment: UserAppEntity,
	): AppUserApplicationAssignmentResponse {
		return {
			id: assignment.id,
			appUserId: assignment.appUserId,
			applicationId: assignment.applicationId,
		};
	}

	static toRoleAssignmentResponse(assignment: UserRoleEntity): AppUserRoleAssignmentResponse {
		return {
			id: assignment.id,
			appUserId: assignment.appUserId,
			applicationId: assignment.applicationId,
			roleId: assignment.roleId,
		};
	}

	static toAssignApplicationResponse(
		assignment: UserAppEntity,
	): ResponseBody<AppUserApplicationAssignmentResponse> {
		return ResponseBody.success(
			APPLICATION_ASSIGNED_MESSAGE,
			AppUserMapper.toApplicationAssignmentResponse(assignment),
		);
	}

	static toAssignRoleResponse(
		assignment: UserRoleEntity,
	): ResponseBody<AppUserRoleAssignmentResponse> {
		return ResponseBody.success(
			ROLE_ASSIGNED_MESSAGE,
			AppUserMapper.toRoleAssignmentResponse(assignment),
		);
	}

	static toFindConnectionsResponse(
		connections: ConnectionResponse[],
	): ResponseBody<ConnectionResponse[]> {
		return ResponseBody.success(CONNECTIONS_RETRIEVED_MESSAGE, connections);
	}

	static toCreateConnectionResponse(
		connection: ConnectionResponse,
	): ResponseBody<ConnectionResponse> {
		return ResponseBody.success(CONNECTION_CREATED_MESSAGE, connection);
	}

	static toLoginResponse(accessToken: string): ResponseBody<ResponseLogin> {
		return ResponseBody.success(LOGIN_SUCCESSFUL_MESSAGE, new ResponseLogin(accessToken));
	}
}
