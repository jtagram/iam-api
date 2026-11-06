import { AppUserConnectionEntity } from '../../common/database/app-user-connection/app-user-connection.entity';
import { AppUserEntity } from '../../common/database/app-user/app-user.entity';
import { UserAppEntity } from '../../common/database/user-application/user-app.entity';
import { UserRoleEntity } from '../../common/database/user-role/user-role.entity';
import { CreateConnectionDto } from '../../common/dto/create-connection.dto';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { ResponseLogin } from '../../common/dto/response-login.dto';
import { CreateAppUserDto } from './dto/create-app-user.dto';
import { AppUserCreatedResponse } from './dto/app-user-created-response.dto';
import { AppUserResponse } from './dto/app-user-response.dto';

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

	static toFindAssignedApplicationsResponse(appUser: AppUserEntity): ResponseBody<AppUserEntity> {
		return ResponseBody.success(ASSIGNED_APPLICATIONS_RETRIEVED_MESSAGE, appUser);
	}

	static toConnectionEntity(appUserId: number, dto: CreateConnectionDto): AppUserConnectionEntity {
		return Object.assign(new AppUserConnectionEntity(), {
			appUserId,
			originApplicationId: dto.originApplicationId,
			destinationApplicationId: dto.destinationApplicationId,
		});
	}

	static toApplicationAssignmentEntity(appUserId: number, applicationId: number): UserAppEntity {
		return Object.assign(new UserAppEntity(), { appUserId, applicationId });
	}

	static toRoleAssignmentEntity(appUserApplicationId: number, roleId: number): UserRoleEntity {
		return Object.assign(new UserRoleEntity(), { appUserApplicationId, roleId });
	}

	// The user is reloaded with its assignment tree after the assignment is
	// created and returned as the entity (secrets are dropped on serialization).
	static toAssignApplicationResponse(appUser: AppUserEntity): ResponseBody<AppUserEntity> {
		return ResponseBody.success(APPLICATION_ASSIGNED_MESSAGE, appUser);
	}

	static toAssignRoleResponse(appUser: AppUserEntity): ResponseBody<AppUserEntity> {
		return ResponseBody.success(ROLE_ASSIGNED_MESSAGE, appUser);
	}

	// The user is reloaded with its connections (and both applications of each) and
	// returned as the entity (secrets are dropped on serialization).
	static toFindConnectionsResponse(appUser: AppUserEntity): ResponseBody<AppUserEntity> {
		return ResponseBody.success(CONNECTIONS_RETRIEVED_MESSAGE, appUser);
	}

	static toCreateConnectionResponse(appUser: AppUserEntity): ResponseBody<AppUserEntity> {
		return ResponseBody.success(CONNECTION_CREATED_MESSAGE, appUser);
	}

	static toLoginResponse(accessToken: string): ResponseBody<ResponseLogin> {
		return ResponseBody.success(LOGIN_SUCCESSFUL_MESSAGE, new ResponseLogin(accessToken));
	}
}
