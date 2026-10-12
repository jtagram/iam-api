import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiApplicationHeaders } from '../../../common/swagger/api-application-headers.decorator';
import { ResponseLogin } from '../../../common/dto/response-login.dto';

export const ApiInternalUserLogin = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Log in an internal user',
      description:
        'Validates the credentials and returns an access token scoped to the target application.',
    }),
    ApiApplicationHeaders(),
    ApiOkResponse({
      description: 'Access token issued.',
      type: ResponseLogin,
    }),
    ApiBadRequestResponse({
      description: [
        'Invalid request:',
        '- The body is invalid (`email` or `password`).',
        '- `x-origin-application` or `x-target-application` is missing or blank.',
      ].join('\n'),
    }),
    ApiUnauthorizedResponse({
      description: 'Invalid credentials (unknown email or wrong password).',
    }),
    ApiForbiddenResponse({
      description: [
        'Access denied:',
        '- `No access to the origin application`: the user is not assigned to the origin application.',
        '- `No access to the target application`: the user is not assigned to the target application.',
        '- `No connection allowed between these applications`: the user has no origin → target connection.',
        '- `No roles assigned in the target application`: the user has no role in the target application.',
      ].join('\n'),
    }),
    ApiNotFoundResponse({
      description: [
        'Application not found:',
        '- `Origin application not found`',
        '- `Target application not found`',
      ].join('\n'),
    }),
  );
