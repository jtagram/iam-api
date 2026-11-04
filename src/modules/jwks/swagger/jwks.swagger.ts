import { applyDecorators } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { ApiOkResponseBody } from '../../../common/swagger/api-response-body.decorator';
import { JwksResponse } from '../dto/jwks-response.dto';

export const ApiGetJwks = () =>
	applyDecorators(
		ApiOperation({
			summary: 'Get the JSON Web Key Set',
			description:
				'Public endpoint (no authentication). Returns the public key other services use to verify the tokens issued by this API.',
		}),
		ApiOkResponseBody({
			description: 'JSON Web Key Set.',
			type: JwksResponse,
			msg: 'JWKS retrieved successfully',
		}),
	);
