import { InternalUserConnectionEntity } from '../../common/database/internal-user-connection/internal-user-connection.entity';
import { InternalUserAppEntity } from '../../common/database/internal-user/internal-user-app.entity';
import { InternalUserRoleEntity } from '../../common/database/internal-user/internal-user-role.entity';
import { InternalUserEntity } from '../../common/database/internal-user/internal-user.entity';
import { CreateConnectionDto } from '../../common/dto/create-connection.dto';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { ResponseLogin } from '../../common/dto/response-login.dto';
import { CreateInternalUserDto } from './dto/create-internal-user.dto';
import { InternalUserResponse } from './dto/internal-user-response.dto';

const INTERNAL_USER_CREATED_MESSAGE = 'Internal user created successfully';
const INTERNAL_USERS_RETRIEVED_MESSAGE = 'Internal users retrieved successfully';
const ASSIGNED_APPLICATIONS_RETRIEVED_MESSAGE = 'Assigned applications retrieved successfully';
const INTERNAL_USERS_WITH_APPLICATIONS_RETRIEVED_MESSAGE =
	'Internal users with applications retrieved successfully';
const APPLICATION_ASSIGNED_MESSAGE = 'Application assigned to internal user successfully';
const ROLE_ASSIGNED_MESSAGE = 'Role assigned to internal user successfully';
const CONNECTIONS_RETRIEVED_MESSAGE = 'Connections retrieved successfully';
const CONNECTION_CREATED_MESSAGE = 'Connection created successfully';
const LOGIN_SUCCESSFUL_MESSAGE = 'Login successful';

export class InternalUserMapper {
	static toEntity(dto: CreateInternalUserDto, hashedPassword: string): InternalUserEntity {
		return InternalUserEntity.builder()
			.withName(dto.name)
			.withLastname(dto.lastname)
			.withEmail(dto.email)
			.withPassword(hashedPassword)
			.build();
	}

	static toInternalUserResponse(internalUser: InternalUserEntity): InternalUserResponse {
		return {
			id: internalUser.id,
			name: internalUser.name,
			lastname: internalUser.lastname,
			email: internalUser.email,
		};
	}

	static toApplicationAssignmentEntity(
		internalUserId: number,
		applicationId: number,
	): InternalUserAppEntity {
		return Object.assign(new InternalUserAppEntity(), { internalUserId, applicationId });
	}

	static toRoleAssignmentEntity(
		internalUserApplicationId: number,
		roleId: number,
	): InternalUserRoleEntity {
		return Object.assign(new InternalUserRoleEntity(), { internalUserApplicationId, roleId });
	}

	static toConnectionEntity(
		internalUserId: number,
		dto: CreateConnectionDto,
	): InternalUserConnectionEntity {
		return Object.assign(new InternalUserConnectionEntity(), {
			internalUserId,
			originApplicationId: dto.originApplicationId,
			destinationApplicationId: dto.destinationApplicationId,
		});
	}

	static toCreateResponse(internalUser: InternalUserEntity): ResponseBody<InternalUserResponse> {
		return ResponseBody.success(
			INTERNAL_USER_CREATED_MESSAGE,
			InternalUserMapper.toInternalUserResponse(internalUser),
		);
	}

	static toFindAllResponse(
		internalUsers: InternalUserEntity[],
	): ResponseBody<InternalUserResponse[]> {
		return ResponseBody.success(
			INTERNAL_USERS_RETRIEVED_MESSAGE,
			internalUsers.map((internalUser) => InternalUserMapper.toInternalUserResponse(internalUser)),
		);
	}

	// The users come straight from the repository, assignment tree included; the
	// response carries the entities as they are (secrets are dropped on
	// serialization, see `InternalUserEntity.password`).
	static toFindAllWithApplicationsResponse(
		internalUsers: InternalUserEntity[],
	): ResponseBody<InternalUserEntity[]> {
		return ResponseBody.success(INTERNAL_USERS_WITH_APPLICATIONS_RETRIEVED_MESSAGE, internalUsers);
	}

	static toFindAssignedApplicationsResponse(
		internalUser: InternalUserEntity,
	): ResponseBody<InternalUserEntity> {
		return ResponseBody.success(ASSIGNED_APPLICATIONS_RETRIEVED_MESSAGE, internalUser);
	}

	// The user is reloaded with its assignment tree after the assignment is
	// created and returned as the entity (secrets are dropped on serialization).
	static toAssignApplicationResponse(
		internalUser: InternalUserEntity,
	): ResponseBody<InternalUserEntity> {
		return ResponseBody.success(APPLICATION_ASSIGNED_MESSAGE, internalUser);
	}

	static toAssignRoleResponse(internalUser: InternalUserEntity): ResponseBody<InternalUserEntity> {
		return ResponseBody.success(ROLE_ASSIGNED_MESSAGE, internalUser);
	}

	// The user is reloaded with its connections (and both applications of each) and
	// returned as the entity (secrets are dropped on serialization).
	static toFindConnectionsResponse(
		internalUser: InternalUserEntity,
	): ResponseBody<InternalUserEntity> {
		return ResponseBody.success(CONNECTIONS_RETRIEVED_MESSAGE, internalUser);
	}

	static toCreateConnectionResponse(
		internalUser: InternalUserEntity,
	): ResponseBody<InternalUserEntity> {
		return ResponseBody.success(CONNECTION_CREATED_MESSAGE, internalUser);
	}

	static toLoginResponse(accessToken: string): ResponseBody<ResponseLogin> {
		return ResponseBody.success(LOGIN_SUCCESSFUL_MESSAGE, new ResponseLogin(accessToken));
	}
}
