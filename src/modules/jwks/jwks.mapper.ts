import { JsonWebKey } from 'crypto';
import { ResponseBody } from '../../common/dto/response-body.dto';

const JWKS_RETRIEVED_MESSAGE = 'JWKS retrieved successfully';

export class JwksMapper {
	static toGetJwksResponse(jwks: { keys: JsonWebKey[] }): ResponseBody<{ keys: JsonWebKey[] }> {
		return ResponseBody.success(JWKS_RETRIEVED_MESSAGE, jwks);
	}
}
