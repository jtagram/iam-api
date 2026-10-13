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
