import { describe, expect, it } from '@jest/globals';
import { JwksMapper } from '../../jwks.mapper';

describe('JwksMapper.toGetJwksResponse', () => {
	it('wraps the key set in a success envelope', () => {
		const jwks = { keys: [{ kty: 'RSA', n: 'modulus', e: 'AQAB' }] };

		const response = JwksMapper.toGetJwksResponse(jwks);

		expect(response.ok).toBe(true);
		expect(response.msg).toBe('JWKS retrieved successfully');
		expect(response.data).toEqual(jwks);
	});

	it('keeps an empty key set untouched', () => {
		const response = JwksMapper.toGetJwksResponse({ keys: [] });

		expect(response.ok).toBe(true);
		expect(response.data).toEqual({ keys: [] });
	});
});
