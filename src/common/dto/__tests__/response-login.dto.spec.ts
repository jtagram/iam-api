import { describe, expect, it } from '@jest/globals';
import { ResponseLogin } from '../response-login.dto';

describe('ResponseLogin', () => {
  it('stores the access token', () => {
    const response = new ResponseLogin('token-value');

    expect(response.access_token).toBe('token-value');
  });

  it('serializes with the snake_case access_token field', () => {
    const response = new ResponseLogin('token-value');

    expect(JSON.parse(JSON.stringify(response))).toEqual({
      access_token: 'token-value',
    });
  });
});
