import { ApiProperty } from '@nestjs/swagger';

/** One RSA public key in JWK format. */
export class JwkResponse {
	@ApiProperty({ description: 'Key type.', example: 'RSA' })
	kty: string;

	@ApiProperty({
		description: 'RSA modulus, base64url encoded.',
		example:
			'0vx7agoebGcQSuuPiLJXZptN9nndrQmbXEps2aiAFbWhM78LhWx4cbbfAAtVT86zwu1RK7aPFFxuhDR1L6tSoc_BJECPebWKRXjBZCiFV4n3oknjhMstn64tZ_2W-5JsGY4Hc5n9yBXArwl93lqt7_RN5w6Cf0h4QyQ5v-65YGjQR0_FDW2QvzqY368QQMicAtaSqzs8KJZgnYb9c7d0zgdAZHzu6qMQvRL5hajrn1n91CbOpbISD08qNLyrdkt-bFTWhAI4vMQFh6WeZu0fM4lFd2NcRwr3XPksINHaQ-G_xBniIqbw0Ls1jF44-csFCur-kEgU8awapJzKnqDKgw',
	})
	n: string;

	@ApiProperty({
		description: 'RSA public exponent, base64url encoded.',
		example: 'AQAB',
	})
	e: string;

	@ApiProperty({ description: 'Intended key use.', example: 'sig' })
	use: string;

	@ApiProperty({ description: 'Signing algorithm.', example: 'RS256' })
	alg: string;

	@ApiProperty({ description: 'Key identifier.', example: 'iam-api-rsa-1' })
	kid: string;
}

export class JwksResponse {
	@ApiProperty({
		description: 'Public keys that verify the tokens issued by this API.',
		type: () => [JwkResponse],
	})
	keys: JwkResponse[];
}
