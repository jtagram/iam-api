import { applyDecorators } from '@nestjs/common';
import {
	ApiBadRequestResponse,
	ApiConflictResponse,
	ApiNotFoundResponse,
	ApiOperation,
	ApiParam,
} from '@nestjs/swagger';
import { ApiProtected } from '../../../common/swagger/api-protected.decorator';
import {
	ApiCreatedResponseBody,
	ApiOkResponseBody,
} from '../../../common/swagger/api-response-body.decorator';
import { AppUserCreatedResponse } from '../dto/app-user-created-response.dto';
import { AppUserResponse } from '../dto/app-user-response.dto';
import { AppUserWithApplicationsResponse } from '../dto/app-user-with-applications-response.dto';
import { AppUserWithConnectionsResponse } from '../dto/app-user-with-connections-response.dto';

const ApiUserIdParam = () =>
	ApiParam({
		name: 'id',
		description: 'Application user identifier.',
		type: Number,
		example: 1,
	});

const INVALID_ID_CASE =
	'- `Validation failed (numeric string is expected)`: the `id` path parameter is not an integer.';

export const ApiCreateAppUser = () =>
	applyDecorators(
		ApiOperation({
			summary: 'Create an application user',
			description:
				'Registers a new application user and generates its `clienteId` and `clienteSecret`. The plaintext secret is returned only in this response. Requires the `ADMIN` role in the iam application.',
		}),
		ApiProtected(),
		ApiCreatedResponseBody({
			description: 'Application user created.',
			type: AppUserCreatedResponse,
			msg: 'Application user created successfully — store clienteSecret now, it cannot be retrieved again',
		}),
		ApiBadRequestResponse({
			description:
				'Invalid body: `name` (max 30 characters) or `description` (max 200 characters) is missing, not a string, empty or too long.',
		}),
		ApiConflictResponse({
			description:
				'`An application user with this name already exists`: the `name` is already taken.',
		}),
	);

export const ApiFindAllAppUsers = () =>
	applyDecorators(
		ApiOperation({
			summary: 'List application users',
			description:
				'Returns every application user, most recently created first (secrets are never included). Requires the `ADMIN` role in the iam application.',
		}),
		ApiProtected(),
		ApiOkResponseBody({
			description: 'Application users retrieved.',
			type: AppUserResponse,
			isArray: true,
			msg: 'Application users retrieved successfully',
		}),
	);

export const ApiFindAppUserApplications = () =>
	applyDecorators(
		ApiOperation({
			summary: 'List the applications assigned to an application user',
			description:
				'Returns the application user with its `applications` assignments (newest first), each with its application and the roles the user holds in it. Secrets are never included. Requires the `ADMIN` role in the iam application.',
		}),
		ApiUserIdParam(),
		ApiProtected(),
		ApiOkResponseBody({
			description: 'The user with its assigned applications and their roles.',
			type: AppUserWithApplicationsResponse,
			msg: 'Assigned applications retrieved successfully',
		}),
		ApiBadRequestResponse({
			description: ['Invalid request:', INVALID_ID_CASE].join('\n'),
		}),
		ApiNotFoundResponse({
			description: '`Application user not found`: no user has the given `id`.',
		}),
	);

export const ApiAssignAppUserApplication = () =>
	applyDecorators(
		ApiOperation({
			summary: 'Assign an application to an application user',
			description:
				'Grants the application user access to an application. Requires the `ADMIN` role in the iam application.',
		}),
		ApiUserIdParam(),
		ApiProtected(),
		ApiCreatedResponseBody({
			description:
				'Application assigned; returns the user with its updated assignment tree (applications and their roles). Secrets are never included.',
			type: AppUserWithApplicationsResponse,
			msg: 'Application assigned to user successfully',
		}),
		ApiBadRequestResponse({
			description: [
				'Invalid request:',
				INVALID_ID_CASE,
				'- The body is invalid: `applicationId` is missing or not a positive integer.',
			].join('\n'),
		}),
		ApiNotFoundResponse({
			description: [
				'Not found:',
				'- `Application user not found`',
				'- `Application not found`',
			].join('\n'),
		}),
		ApiConflictResponse({
			description: '`Application already assigned to this user`: the assignment already exists.',
		}),
	);

export const ApiAssignAppUserRole = () =>
	applyDecorators(
		ApiOperation({
			summary: 'Assign a role to an application user',
			description:
				'Grants the application user a role. The application is taken from the role and must already be assigned to the user; the role hangs off that application assignment. Requires the `ADMIN` role in the iam application.',
		}),
		ApiUserIdParam(),
		ApiProtected(),
		ApiCreatedResponseBody({
			description:
				'Role assigned; returns the user with its updated assignment tree (applications and their roles). Secrets are never included.',
			type: AppUserWithApplicationsResponse,
			msg: 'Role assigned to user successfully',
		}),
		ApiBadRequestResponse({
			description: [
				'Invalid request:',
				INVALID_ID_CASE,
				'- The body is invalid: `roleId` is missing or not a positive integer.',
			].join('\n'),
		}),
		ApiNotFoundResponse({
			description: ['Not found:', '- `Application user not found`', '- `Role not found`'].join(
				'\n',
			),
		}),
		ApiConflictResponse({
			description: [
				'Conflict:',
				'- `Application is not assigned to the user`: the application of the role must be assigned to the user first.',
				'- `Role already assigned to this user`: the assignment already exists.',
			].join('\n'),
		}),
	);

export const ApiFindAppUserConnections = () =>
	applyDecorators(
		ApiOperation({
			summary: 'List the connections of an application user',
			description:
				'Returns the user with its origin to destination application connections (newest first), each with its origin and destination application; secrets are never included (`connections` is empty for a user without connections). Requires the `ADMIN` role in the iam application.',
		}),
		ApiUserIdParam(),
		ApiProtected(),
		ApiOkResponseBody({
			description: 'The user with its connections.',
			type: AppUserWithConnectionsResponse,
			msg: 'Connections retrieved successfully',
		}),
		ApiBadRequestResponse({
			description: ['Invalid request:', INVALID_ID_CASE].join('\n'),
		}),
		ApiNotFoundResponse({
			description: '`Application user not found`: no user has the given `id`.',
		}),
	);

export const ApiCreateAppUserConnection = () =>
	applyDecorators(
		ApiOperation({
			summary: 'Create a connection for an application user',
			description:
				'Allows the user to log in from an origin application towards a destination application. Both applications must already be assigned to the user. Requires the `ADMIN` role in the iam application.',
		}),
		ApiUserIdParam(),
		ApiProtected(),
		ApiCreatedResponseBody({
			description:
				'Connection created; returns the user whose `connections` holds only the connection just created, with its origin and destination application. Use `GET /apps-users/:id/connections` for the full list. Secrets are never included.',
			type: AppUserWithConnectionsResponse,
			msg: 'Connection created successfully',
		}),
		ApiBadRequestResponse({
			description: [
				'Invalid request:',
				INVALID_ID_CASE,
				'- The body is invalid: `originApplicationId` or `destinationApplicationId` is missing or not a positive integer.',
				'- `Origin and destination applications must be different`',
				'- `The user does not have the origin application assigned`: also returned when no application has the given `originApplicationId`.',
				'- `The user does not have the destination application assigned`: also returned when no application has the given `destinationApplicationId`.',
			].join('\n'),
		}),
		ApiNotFoundResponse({
			description: ['Not found:', '- `Application user not found`'].join('\n'),
		}),
		ApiConflictResponse({
			description:
				'`This connection already exists for the user`: the same origin and destination pair already exists.',
		}),
	);
