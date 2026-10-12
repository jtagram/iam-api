import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { ConnectionResponse } from '../../../common/dto/connection-response.dto';
import { ApiProtected } from '../../../common/swagger/api-protected.decorator';
import {
  ApiCreatedResponseBody,
  ApiOkResponseBody,
} from '../../../common/swagger/api-response-body.decorator';
import { AppUserApplicationAssignmentResponse } from '../dto/app-user-application-assignment-response.dto';
import { AppUserApplicationRolesResponse } from '../dto/app-user-application-roles-response.dto';
import { AppUserCreatedResponse } from '../dto/app-user-created-response.dto';
import { AppUserResponse } from '../dto/app-user-response.dto';
import { AppUserRoleAssignmentResponse } from '../dto/app-user-role-assignment-response.dto';

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
        'Invalid body: `name` (max 20 characters) or `description` (max 200 characters) is missing, not a string or too long.',
    }),
  );

export const ApiFindAllAppUsers = () =>
  applyDecorators(
    ApiOperation({
      summary: 'List application users',
      description:
        'Returns every application user (secrets are never included). Requires the `ADMIN` role in the iam application.',
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
        'Returns the applications assigned to the user, each with the roles the user holds in it. Requires the `ADMIN` role in the iam application.',
    }),
    ApiUserIdParam(),
    ApiProtected(),
    ApiOkResponseBody({
      description: 'Assigned applications with their roles.',
      type: AppUserApplicationRolesResponse,
      isArray: true,
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
      description: 'Application assigned.',
      type: AppUserApplicationAssignmentResponse,
      msg: 'Application assigned to user successfully',
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
        '- `Application user not found`',
        '- `Application not found`',
      ].join('\n'),
    }),
    ApiConflictResponse({
      description:
        '`Application already assigned to this user`: the assignment already exists.',
    }),
  );

export const ApiAssignAppUserRole = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Assign a role to an application user',
      description:
        'Grants the application user a role. The application is taken from the role. Requires the `ADMIN` role in the iam application.',
    }),
    ApiUserIdParam(),
    ApiProtected(),
    ApiCreatedResponseBody({
      description: 'Role assigned.',
      type: AppUserRoleAssignmentResponse,
      msg: 'Role assigned to user successfully',
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
        '- `Application user not found`',
        '- `Role not found`',
      ].join('\n'),
    }),
    ApiConflictResponse({
      description:
        '`Role already assigned to this user`: the assignment already exists.',
    }),
  );

export const ApiFindAppUserConnections = () =>
  applyDecorators(
    ApiOperation({
      summary: 'List the connections of an application user',
      description:
        'Returns the origin to destination application connections of the user. Requires the `ADMIN` role in the iam application.',
    }),
    ApiUserIdParam(),
    ApiProtected(),
    ApiOkResponseBody({
      description: 'Connections of the user.',
      type: ConnectionResponse,
      isArray: true,
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
      description: 'Connection created.',
      type: ConnectionResponse,
      msg: 'Connection created successfully',
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
        '- `Application user not found`',
        '- `Application not found`: the origin or destination application does not exist.',
      ].join('\n'),
    }),
    ApiConflictResponse({
      description:
        '`This connection already exists for the user`: the same origin and destination pair already exists.',
    }),
  );
