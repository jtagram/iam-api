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
import { InternalUserResponse } from '../dto/internal-user-response.dto';
import { InternalUserWithApplicationsResponse } from '../dto/internal-user-with-applications-response.dto';
import { InternalUserWithConnectionsResponse } from '../dto/internal-user-with-connections-response.dto';

const ApiUserIdParam = () =>
	ApiParam({
		name: 'id',
		description: 'Internal user identifier.',
		type: Number,
		example: 1,
	});

const INVALID_ID_CASE =
	'- `Validation failed (numeric string is expected)`: the `id` path parameter is not an integer.';

export const ApiCreateInternalUser = () =>
	applyDecorators(
		ApiOperation({
			summary: 'Create an internal user',
			description:
				'Registers a new internal user with a hashed password. Requires the `ADMIN` role in the iam application.',
		}),
		ApiProtected(),
		ApiCreatedResponseBody({
			description: 'Internal user created.',
			type: InternalUserResponse,
			msg: 'Internal user created successfully',
		}),
		ApiBadRequestResponse({
			description:
				'Invalid body: `name` or `lastname` (max 30 characters), `email` (max 30 characters, valid email) or `password` (8 to 72 characters) is missing, not a string, empty or too long.',
		}),
		ApiConflictResponse({
			description: '`Email already in use`: the `email` is already registered.',
		}),
	);

export const ApiFindAllInternalUsers = () =>
	applyDecorators(
		ApiOperation({
			summary: 'List internal users',
			description:
				'Returns every internal user, most recently created first. Requires the `ADMIN` role in the iam application.',
		}),
		ApiProtected(),
		ApiOkResponseBody({
			description: 'Internal users retrieved.',
			type: InternalUserResponse,
			isArray: true,
			msg: 'Internal users retrieved successfully',
		}),
	);

export const ApiFindInternalUsersByRole = () =>
	applyDecorators(
		ApiOperation({
			summary: 'List internal users by application and roles',
			description:
				'Returns the internal users that hold at least one of the given roles in the given application. Requires the `ADMIN` role in the iam application.',
		}),
		ApiProtected(),
		ApiOkResponseBody({
			description:
				'Matching internal users (empty list if none match, including an unknown application).',
			type: InternalUserResponse,
			isArray: true,
			msg: 'Internal users retrieved successfully',
		}),
		ApiBadRequestResponse({
			description:
				'Invalid query: `applicationName` (max 30 characters) or `roles` is missing or empty.',
		}),
	);

export const ApiFindInternalUsersWithApplications = () =>
	applyDecorators(
		ApiOperation({
			summary: 'List every internal user with its assigned applications',
			description:
				'Returns every internal user, most recently created first, each with its application assignments, their application and the roles it holds in them; the password is never included (`applications` is empty for a user without assignments). Requires the `ADMIN` role in the iam application.',
		}),
		ApiProtected(),
		ApiOkResponseBody({
			description: 'Internal users with their applications retrieved.',
			type: InternalUserWithApplicationsResponse,
			isArray: true,
			msg: 'Internal users with applications retrieved successfully',
		}),
	);

export const ApiFindInternalUserApplications = () =>
	applyDecorators(
		ApiOperation({
			summary: 'List the applications assigned to an internal user',
			description:
				'Returns the internal user with its `applications` assignments (newest first), each with its application and the roles the user holds in it. Secrets are never included. Requires the `ADMIN` role in the iam application.',
		}),
		ApiUserIdParam(),
		ApiProtected(),
		ApiOkResponseBody({
			description: 'The user with its assigned applications and their roles.',
			type: InternalUserWithApplicationsResponse,
			msg: 'Assigned applications retrieved successfully',
		}),
		ApiBadRequestResponse({
			description: ['Invalid request:', INVALID_ID_CASE].join('\n'),
		}),
		ApiNotFoundResponse({
			description: '`Internal user not found`: no user has the given `id`.',
		}),
	);

export const ApiAssignInternalUserApplication = () =>
	applyDecorators(
		ApiOperation({
			summary: 'Assign an application to an internal user',
			description:
				'Grants the internal user access to an application. Requires the `ADMIN` role in the iam application.',
		}),
		ApiUserIdParam(),
		ApiProtected(),
		ApiCreatedResponseBody({
			description:
				'Application assigned; returns the user with its updated assignment tree (applications and their roles). Secrets are never included.',
			type: InternalUserWithApplicationsResponse,
			msg: 'Application assigned to internal user successfully',
		}),
		ApiBadRequestResponse({
			description: [
				'Invalid request:',
				INVALID_ID_CASE,
				'- The body is invalid: `applicationId` is missing or not a positive integer.',
			].join('\n'),
		}),
		ApiNotFoundResponse({
			description: ['Not found:', '- `Internal user not found`', '- `Application not found`'].join(
				'\n',
			),
		}),
		ApiConflictResponse({
			description: '`Application already assigned to this user`: the assignment already exists.',
		}),
	);

export const ApiAssignInternalUserRole = () =>
	applyDecorators(
		ApiOperation({
			summary: 'Assign a role to an internal user',
			description:
				'Grants the internal user a role. The application is taken from the role and must already be assigned to the user; the role hangs off that application assignment. Requires the `ADMIN` role in the iam application.',
		}),
		ApiUserIdParam(),
		ApiProtected(),
		ApiCreatedResponseBody({
			description:
				'Role assigned; returns the user with its updated assignment tree (applications and their roles). Secrets are never included.',
			type: InternalUserWithApplicationsResponse,
			msg: 'Role assigned to internal user successfully',
		}),
		ApiBadRequestResponse({
			description: [
				'Invalid request:',
				INVALID_ID_CASE,
				'- The body is invalid: `roleId` is missing or not a positive integer.',
			].join('\n'),
		}),
		ApiNotFoundResponse({
			description: ['Not found:', '- `Internal user not found`', '- `Role not found`'].join('\n'),
		}),
		ApiConflictResponse({
			description: [
				'Conflict:',
				'- `Application is not assigned to the user`: the application of the role must be assigned to the user first.',
				'- `Role already assigned to this user`: the assignment already exists.',
			].join('\n'),
		}),
	);

export const ApiFindInternalUserConnections = () =>
	applyDecorators(
		ApiOperation({
			summary: 'List the connections of an internal user',
			description:
				'Returns the user with its origin to destination application connections (newest first), each with its origin and destination application; secrets are never included (`connections` is empty for a user without connections). Requires the `ADMIN` role in the iam application.',
		}),
		ApiUserIdParam(),
		ApiProtected(),
		ApiOkResponseBody({
			description: 'The user with its connections.',
			type: InternalUserWithConnectionsResponse,
			msg: 'Connections retrieved successfully',
		}),
		ApiBadRequestResponse({
			description: ['Invalid request:', INVALID_ID_CASE].join('\n'),
		}),
		ApiNotFoundResponse({
			description: '`Internal user not found`: no user has the given `id`.',
		}),
	);

export const ApiCreateInternalUserConnection = () =>
	applyDecorators(
		ApiOperation({
			summary: 'Create a connection for an internal user',
			description:
				'Allows the user to log in from an origin application towards a destination application. Both applications must already be assigned to the user. Requires the `ADMIN` role in the iam application.',
		}),
		ApiUserIdParam(),
		ApiProtected(),
		ApiCreatedResponseBody({
			description:
				'Connection created; returns the user whose `connections` holds only the created connection, with its origin and destination application. Secrets are never included.',
			type: InternalUserWithConnectionsResponse,
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
			description: ['Not found:', '- `Internal user not found`'].join('\n'),
		}),
		ApiConflictResponse({
			description:
				'`This connection already exists for the user`: the same origin and destination pair already exists.',
		}),
	);
