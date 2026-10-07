import { describe, expect, it } from '@jest/globals';
import {
  validateBody,
  validationMessages,
} from '../../../../../test/helpers/validation';
import { LoginDto } from '../../dto/login.dto';

describe('LoginDto', () => {
  it('accepts a clienteId and a clienteSecret', async () => {
    const dto = await validateBody(LoginDto, {
      clienteId: 'client-1',
      clienteSecret: 'secret',
    });

    expect(dto).toBeInstanceOf(LoginDto);
    expect(dto).toEqual({ clienteId: 'client-1', clienteSecret: 'secret' });
  });

  it('accepts a clienteId of exactly 15 characters', async () => {
    const dto = await validateBody(LoginDto, {
      clienteId: 'x'.repeat(15),
      clienteSecret: 's',
    });

    expect(dto).toBeInstanceOf(LoginDto);
  });

  it('rejects a missing clienteId', async () => {
    const messages = await validationMessages(() =>
      validateBody(LoginDto, { clienteSecret: 's' }),
    );

    expect(messages).toEqual([
      'clienteId must be shorter than or equal to 15 characters',
      'clienteId should not be empty',
      'clienteId must be a string',
    ]);
  });

  it('rejects an empty clienteId', async () => {
    const messages = await validationMessages(() =>
      validateBody(LoginDto, { clienteId: '', clienteSecret: 's' }),
    );

    expect(messages).toEqual(['clienteId should not be empty']);
  });

  it('rejects a clienteId longer than 15 characters', async () => {
    const messages = await validationMessages(() =>
      validateBody(LoginDto, { clienteId: 'x'.repeat(16), clienteSecret: 's' }),
    );

    expect(messages).toEqual([
      'clienteId must be shorter than or equal to 15 characters',
    ]);
  });

  it('rejects a missing clienteSecret', async () => {
    const messages = await validationMessages(() =>
      validateBody(LoginDto, { clienteId: 'c' }),
    );

    expect(messages).toEqual([
      'clienteSecret should not be empty',
      'clienteSecret must be a string',
    ]);
  });

  it('rejects an empty clienteSecret', async () => {
    const messages = await validationMessages(() =>
      validateBody(LoginDto, { clienteId: 'c', clienteSecret: '' }),
    );

    expect(messages).toEqual(['clienteSecret should not be empty']);
  });

  it('rejects a non-string clienteSecret', async () => {
    const messages = await validationMessages(() =>
      validateBody(LoginDto, { clienteId: 'c', clienteSecret: 123 }),
    );

    expect(messages).toEqual(['clienteSecret must be a string']);
  });
});
