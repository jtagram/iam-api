import { ApplicationEntity } from '../../common/database/application/application.entity';
import { RoleEntity } from '../../common/database/role/role.entity';
import { ResponseBody } from '../../common/dto/response-body.dto';
import {
	ApplicationRoleItemResponse,
	ApplicationRolesResponse,
} from './dto/application-roles-response.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { RoleResponse } from './dto/role-response.dto';

const ROLE_CREATED_MESSAGE = 'Role created successfully';
const ROLES_RETRIEVED_MESSAGE = 'Roles retrieved successfully';
const ROLES_GROUPED_BY_APPLICATION_RETRIEVED_MESSAGE =
	'Roles grouped by application retrieved successfully';

export class RoleMapper {
	static toEntity(dto: CreateRoleDto): RoleEntity {
		return RoleEntity.builder()
			.withApplicationId(dto.applicationId)
			.withName(dto.name)
			.withDescription(dto.description)
			.build();
	}

	static toResponse(role: RoleEntity): RoleResponse {
		return {
			id: role.id,
			applicationId: role.applicationId,
			name: role.name,
			description: role.description,
		};
	}

	static toCreateResponse(role: RoleEntity): ResponseBody<RoleResponse> {
		return ResponseBody.success(ROLE_CREATED_MESSAGE, RoleMapper.toResponse(role));
	}

	static toFindAllByApplicationIdResponse(roles: RoleEntity[]): ResponseBody<RoleResponse[]> {
		return ResponseBody.success(
			ROLES_RETRIEVED_MESSAGE,
			roles.map((role) => RoleMapper.toResponse(role)),
		);
	}

	static toApplicationRolesResponse(application: ApplicationEntity): ApplicationRolesResponse {
		return {
			applicationId: application.id,
			applicationName: application.name,
			applicationDescription: application.description,
			roles: RoleMapper.toApplicationRoleItems(application.roles),
		};
	}

	static toApplicationRoleItems(roles: RoleEntity[]): ApplicationRoleItemResponse[] {
		return roles.map((role) => ({
			id: role.id,
			name: role.name,
			description: role.description,
		}));
	}

	static toFindAllGroupedByApplicationResponse(
		applicationsRoles: ApplicationRolesResponse[],
	): ResponseBody<ApplicationRolesResponse[]> {
		return ResponseBody.success(ROLES_GROUPED_BY_APPLICATION_RETRIEVED_MESSAGE, applicationsRoles);
	}
}
