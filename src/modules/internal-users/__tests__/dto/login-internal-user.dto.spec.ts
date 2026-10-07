import { describe, expect, it } from '@jest/globals';
import {
  validateBody,
  validationMessages,
} from '../../../../../test/helpers/validation';
import { LoginInternalUserDto } from '../../dto/login-internal-user.dto';

describe('LoginInternalUserDto', () => {
  it('accepts an email and a password', async () => {
    const dto = await validateBody(LoginInternalUserDto, {
      email: 'ada@example.com',
      password: 'secret',
    });

    expect(dto).toBeInstanceOf(LoginInternalUserDto);
    expect(dto).toEqual({ email: 'ada@example.com', password: 'secret' });
  });

  it('rejects an invalid email', async () => {
    const messages = await validationMessages(() =>
      validateBody(LoginInternalUserDto, { email: 'nope', password: 'secret' }),
    );

    expect(messages).toEqual(['email must be an email']);
  });

  it('rejects a missing email', async () => {
    const messages = await validationMessages(() =>
      validateBody(LoginInternalUserDto, { password: 'secret' }),
    );

    expect(messages).toEqual([
      'email must be shorter than or equal to 30 characters',
      'email must be an email',
    ]);
  });

  it('rejects an email longer than 30 characters', async () => {
    const messages = await validationMessages(() =>
      validateBody(LoginInternalUserDto, {
        email: `${'x'.repeat(25)}@example.com`,
        password: 'secret',
      }),
    );

    expect(messages).toEqual([
      'email must be shorter than or equal to 30 characters',
    ]);
  });

  it('rejects a missing password', async () => {
    const messages = await validationMessages(() =>
      validateBody(LoginInternalUserDto, { email: 'ada@example.com' }),
    );

    expect(messages).toEqual([
      'password should not be empty',
      'password must be a string',
    ]);
  });

  it('rejects an empty password', async () => {
    const messages = await validationMessages(() =>
      validateBody(LoginInternalUserDto, {
        email: 'ada@example.com',
        password: '',
      }),
    );

    expect(messages).toEqual(['password should not be empty']);
  });

  it('rejects a non-string password', async () => {
    const messages = await validationMessages(() =>
      validateBody(LoginInternalUserDto, {
        email: 'ada@example.com',
        password: 12345678,
      }),
    );

    expect(messages).toEqual(['password must be a string']);
  });
});
