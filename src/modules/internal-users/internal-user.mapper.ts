import { InternalUserAppEntity } from '../../common/database/internal-user/internal-user-app.entity';
import { InternalUserRoleEntity } from '../../common/database/internal-user/internal-user-role.entity';
import { InternalUserEntity } from '../../common/database/internal-user/internal-user.entity';
import { ConnectionResponse } from '../../common/dto/connection-response.dto';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { ResponseLogin } from '../../common/dto/response-login.dto';
import { CreateInternalUserDto } from './dto/create-internal-user.dto';
import { InternalUserApplicationAssignmentResponse } from './dto/internal-user-application-assignment-response.dto';
import { InternalUserApplicationRolesResponse } from './dto/internal-user-application-roles-response.dto';
import { InternalUserCreatedResponse } from './dto/internal-user-created-response.dto';
import { InternalUserRoleAssignmentResponse } from './dto/internal-user-role-assignment-response.dto';

const INTERNAL_USER_CREATED_MESSAGE = 'Internal user created successfully';
const INTERNAL_USERS_RETRIEVED_MESSAGE = 'Internal users retrieved successfully';
const ASSIGNED_APPLICATIONS_RETRIEVED_MESSAGE = 'Assigned applications retrieved successfully';
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

	static toCreatedResponse(internalUser: InternalUserEntity): InternalUserCreatedResponse {
		return {
			id: internalUser.id,
			name: internalUser.name,
			lastname: internalUser.lastname,
			email: internalUser.email,
		};
	}

	static toResponse(internalUser: InternalUserEntity): InternalUserCreatedResponse {
		return this.toCreatedResponse(internalUser);
	}

	static toApplicationAssignmentResponse(
		assignment: InternalUserAppEntity,
	): InternalUserApplicationAssignmentResponse {
		return {
			id: assignment.id,
			internalUserId: assignment.internalUserId,
			applicationId: assignment.applicationId,
		};
	}

	static toRoleAssignmentResponse(
		assignment: InternalUserRoleEntity,
	): InternalUserRoleAssignmentResponse {
		return {
			id: assignment.id,
			internalUserId: assignment.internalUserId,
			applicationId: assignment.applicationId,
			roleId: assignment.roleId,
		};
	}

	static toCreateResponse(
		internalUser: InternalUserEntity,
	): ResponseBody<InternalUserCreatedResponse> {
		return ResponseBody.success(
			INTERNAL_USER_CREATED_MESSAGE,
			InternalUserMapper.toCreatedResponse(internalUser),
		);
	}

	static toFindAllResponse(
		internalUsers: InternalUserEntity[],
	): ResponseBody<InternalUserCreatedResponse[]> {
		return ResponseBody.success(
			INTERNAL_USERS_RETRIEVED_MESSAGE,
			internalUsers.map((internalUser) => InternalUserMapper.toResponse(internalUser)),
		);
	}

	static toFindByApplicationAndRolesResponse(
		internalUsers: InternalUserEntity[],
	): ResponseBody<InternalUserCreatedResponse[]> {
		return ResponseBody.success(
			INTERNAL_USERS_RETRIEVED_MESSAGE,
			internalUsers.map((internalUser) => InternalUserMapper.toResponse(internalUser)),
		);
	}

	static toFindAssignedApplicationsResponse(
		assignedApplications: InternalUserApplicationRolesResponse[],
	): ResponseBody<InternalUserApplicationRolesResponse[]> {
		return ResponseBody.success(ASSIGNED_APPLICATIONS_RETRIEVED_MESSAGE, assignedApplications);
	}

	static toAssignApplicationResponse(
		assignment: InternalUserAppEntity,
	): ResponseBody<InternalUserApplicationAssignmentResponse> {
		return ResponseBody.success(
			APPLICATION_ASSIGNED_MESSAGE,
			InternalUserMapper.toApplicationAssignmentResponse(assignment),
		);
	}

	static toAssignRoleResponse(
		assignment: InternalUserRoleEntity,
	): ResponseBody<InternalUserRoleAssignmentResponse> {
		return ResponseBody.success(
			ROLE_ASSIGNED_MESSAGE,
			InternalUserMapper.toRoleAssignmentResponse(assignment),
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
