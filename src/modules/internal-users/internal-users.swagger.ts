import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { ConnectionResponse } from '../../common/dto/connection-response.dto';
import { ApiProtected } from '../../common/swagger/api-protected.decorator';
import { InternalUserApplicationAssignmentResponse } from './dto/internal-user-application-assignment-response.dto';
import { InternalUserApplicationRolesResponse } from './dto/internal-user-application-roles-response.dto';
import { InternalUserCreatedResponse } from './dto/internal-user-created-response.dto';
import { InternalUserRoleAssignmentResponse } from './dto/internal-user-role-assignment-response.dto';

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
    ApiCreatedResponse({
      description: 'Internal user created.',
      type: InternalUserCreatedResponse,
    }),
    ApiBadRequestResponse({
      description:
        'Invalid body: `name` / `lastname` (max 15 characters), `email` (valid email, max 30 characters) or `password` (8 to 72 characters) is missing or invalid.',
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
        'Returns every internal user. Requires the `ADMIN` role in the iam application.',
    }),
    ApiProtected(),
    ApiOkResponse({
      description: 'Internal users retrieved.',
      type: InternalUserCreatedResponse,
      isArray: true,
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
    ApiOkResponse({
      description: 'Matching internal users (empty list if none match).',
      type: InternalUserCreatedResponse,
      isArray: true,
    }),
    ApiBadRequestResponse({
      description:
        'Invalid query: `applicationName` (max 15 characters) or `roles` is missing or empty.',
    }),
    ApiNotFoundResponse({
      description:
        '`Application not found`: no application has the given `applicationName`.',
    }),
  );

export const ApiFindInternalUserApplications = () =>
  applyDecorators(
    ApiOperation({
      summary: 'List the applications assigned to an internal user',
      description:
        'Returns the applications assigned to the user, each with the roles the user holds in it. Requires the `ADMIN` role in the iam application.',
    }),
    ApiUserIdParam(),
    ApiProtected(),
    ApiOkResponse({
      description: 'Assigned applications with their roles.',
      type: InternalUserApplicationRolesResponse,
      isArray: true,
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
    ApiCreatedResponse({
      description: 'Application assigned.',
      type: InternalUserApplicationAssignmentResponse,
    }),
    ApiBadRequestResponse({
      description: [
        'Invalid request:',
        INVALID_ID_CASE,
        '- The body is invalid: `applicationId` is missing or not an integer.',
      ].join('\n'),
    }),
    ApiNotFoundResponse({
      description: [
        'Not found:',
        '- `Internal user not found`',
        '- `Application not found`',
      ].join('\n'),
    }),
    ApiConflictResponse({
      description:
        '`Application already assigned to this user`: the assignment already exists.',
    }),
  );

export const ApiAssignInternalUserRole = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Assign a role to an internal user',
      description:
        'Grants the internal user a role. The application is taken from the role. Requires the `ADMIN` role in the iam application.',
    }),
    ApiUserIdParam(),
    ApiProtected(),
    ApiCreatedResponse({
      description: 'Role assigned.',
      type: InternalUserRoleAssignmentResponse,
    }),
    ApiBadRequestResponse({
      description: [
        'Invalid request:',
        INVALID_ID_CASE,
        '- The body is invalid: `roleId` is missing or not an integer.',
      ].join('\n'),
    }),
    ApiNotFoundResponse({
      description: [
        'Not found:',
        '- `Internal user not found`',
        '- `Role not found`',
      ].join('\n'),
    }),
    ApiConflictResponse({
      description:
        '`Role already assigned to this user`: the assignment already exists.',
    }),
  );

export const ApiFindInternalUserConnections = () =>
  applyDecorators(
    ApiOperation({
      summary: 'List the connections of an internal user',
      description:
        'Returns the origin to destination application connections of the user. Requires the `ADMIN` role in the iam application.',
    }),
    ApiUserIdParam(),
    ApiProtected(),
    ApiOkResponse({
      description: 'Connections of the user.',
      type: ConnectionResponse,
      isArray: true,
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
    ApiCreatedResponse({
      description: 'Connection created.',
      type: ConnectionResponse,
    }),
    ApiBadRequestResponse({
      description: [
        'Invalid request:',
        INVALID_ID_CASE,
        '- The body is invalid: `originApplicationId` or `destinationApplicationId` is missing or not an integer.',
        '- `Origin and destination applications must be different`',
        '- `The user does not have this application assigned`: the origin or destination application is not assigned to the user.',
      ].join('\n'),
    }),
    ApiNotFoundResponse({
      description: [
        'Not found:',
        '- `Internal user not found`',
        '- `Application not found`: the origin or destination application does not exist.',
      ].join('\n'),
    }),
    ApiConflictResponse({
      description:
        '`This connection already exists for the user`: the same origin and destination pair already exists.',
    }),
  );
