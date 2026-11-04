import { AppUserEntity } from '../../common/database/app-user/app-user.entity';
import { UserAppEntity } from '../../common/database/user-application/user-app.entity';
import { UserRoleEntity } from '../../common/database/user-role/user-role.entity';
import { ConnectionResponse } from '../../common/dto/connection-response.dto';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { ResponseLogin } from '../../common/dto/response-login.dto';
import { CreateAppUserDto } from './dto/create-app-user.dto';
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

	static toCreatedResponse(
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
			AppUserMapper.toCreatedResponse(appUser, plaintextClienteSecret),
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

	static toAssignApplicationResponse(assignment: UserAppEntity): ResponseBody<UserAppEntity> {
		return ResponseBody.success(APPLICATION_ASSIGNED_MESSAGE, assignment);
	}

	static toAssignRoleResponse(assignment: UserRoleEntity): ResponseBody<UserRoleEntity> {
		return ResponseBody.success(ROLE_ASSIGNED_MESSAGE, assignment);
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
