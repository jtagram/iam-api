import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { JwksResponse } from './dto/jwks-response.dto';

export const ApiGetJwks = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Get the JSON Web Key Set',
      description:
        'Public endpoint (no authentication). Returns the public key other services use to verify the tokens issued by this API.',
    }),
    ApiOkResponse({
      description: 'JSON Web Key Set.',
      type: JwksResponse,
    }),
  );
