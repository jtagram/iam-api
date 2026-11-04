import { applyDecorators } from '@nestjs/common';
import {
	ApiBadRequestResponse,
	ApiConflictResponse,
	ApiNotFoundResponse,
	ApiOperation,
} from '@nestjs/swagger';
import { ApiProtected } from '../../../common/swagger/api-protected.decorator';
import {
	ApiCreatedResponseBody,
	ApiOkResponseBody,
} from '../../../common/swagger/api-response-body.decorator';
import { ApplicationRolesResponse } from '../dto/application-roles-response.dto';
import { RoleResponse } from '../dto/role-response.dto';

export const ApiCreateRole = () =>
	applyDecorators(
		ApiOperation({
			summary: 'Create a role',
			description:
				'Creates a role inside an application. Requires the `ADMIN` role in the iam application.',
		}),
		ApiProtected(),
		ApiCreatedResponseBody({
			description: 'Role created.',
			type: RoleResponse,
			msg: 'Role created successfully',
		}),
		ApiBadRequestResponse({
			description:
				'Invalid body: `applicationId` is not an integer, or `name` (max 20 characters) / `description` (max 200 characters) is missing, not a string or too long.',
		}),
		ApiNotFoundResponse({
			description: '`Application not found`: the `applicationId` does not exist.',
		}),
		ApiConflictResponse({
			description:
				'`A role with this name already exists for this application`: the `name` is already used in that application.',
		}),
	);

export const ApiFindRolesGroupedByApplication = () =>
	applyDecorators(
		ApiOperation({
			summary: 'List every application with its roles',
			description:
				'Returns every application, most recently created first, each with all its roles, most recently created first (`roles` is empty for an application without roles). Requires the `ADMIN` role in the iam application.',
		}),
		ApiProtected(),
		ApiOkResponseBody({
			description: 'Roles grouped by application retrieved.',
			type: ApplicationRolesResponse,
			isArray: true,
			msg: 'Roles grouped by application retrieved successfully',
		}),
	);

export const ApiFindRoles = () =>
	applyDecorators(
		ApiOperation({
			summary: 'List the roles of an application',
			description:
				'Returns every role of the application given in the `applicationId` query parameter. Requires the `ADMIN` role in the iam application.',
		}),
		ApiProtected(),
		ApiOkResponseBody({
			description: 'Roles retrieved.',
			type: RoleResponse,
			isArray: true,
			msg: 'Roles retrieved successfully',
		}),
		ApiBadRequestResponse({
			description: 'Invalid query: `applicationId` is missing or not an integer.',
		}),
		ApiNotFoundResponse({
			description: '`Application not found`: the `applicationId` does not exist.',
		}),
	);
