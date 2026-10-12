import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiApplicationHeaders } from '../../common/swagger/api-application-headers.decorator';
import { ResponseLogin } from '../../common/dto/response-login.dto';

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
      description: 'Invalid body or missing application headers.',
    }),
    ApiUnauthorizedResponse({ description: 'Invalid credentials.' }),
    ApiForbiddenResponse({
      description: 'The user has no access to the target application.',
    }),
    ApiNotFoundResponse({ description: 'Target application not found.' }),
  );
