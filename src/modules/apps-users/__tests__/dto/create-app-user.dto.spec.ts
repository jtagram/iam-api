import { describe, expect, it } from '@jest/globals';
import {
  validateBody,
  validationMessages,
} from '../../../../../test/helpers/validation';
import { CreateAppUserDto } from '../../dto/create-app-user.dto';

describe('CreateAppUserDto', () => {
  it('accepts a name and a description', async () => {
    const dto = await validateBody(CreateAppUserDto, {
      name: 'Billing',
      description: 'Billing service',
    });

    expect(dto).toBeInstanceOf(CreateAppUserDto);
    expect(dto).toEqual({ name: 'Billing', description: 'Billing service' });
  });

  it('accepts a name of exactly 20 characters', async () => {
    const dto = await validateBody(CreateAppUserDto, {
      name: 'x'.repeat(20),
      description: 'd',
    });

    expect(dto).toBeInstanceOf(CreateAppUserDto);
  });

  it('accepts an empty name (current behavior, no IsNotEmpty)', async () => {
    const dto = await validateBody(CreateAppUserDto, {
      name: '',
      description: 'd',
    });

    expect(dto).toBeInstanceOf(CreateAppUserDto);
  });

  it('rejects a missing name', async () => {
    const messages = await validationMessages(() =>
      validateBody(CreateAppUserDto, { description: 'd' }),
    );

    expect(messages).toEqual([
      'name must be shorter than or equal to 20 characters',
      'name must be a string',
    ]);
  });

  it('rejects a name longer than 20 characters', async () => {
    const messages = await validationMessages(() =>
      validateBody(CreateAppUserDto, {
        name: 'x'.repeat(21),
        description: 'd',
      }),
    );

    expect(messages).toEqual([
      'name must be shorter than or equal to 20 characters',
    ]);
  });

  it('rejects a missing description', async () => {
    const messages = await validationMessages(() =>
      validateBody(CreateAppUserDto, { name: 'n' }),
    );

    expect(messages).toEqual([
      'description must be shorter than or equal to 200 characters',
      'description must be a string',
    ]);
  });

  it('rejects a description longer than 200 characters', async () => {
    const messages = await validationMessages(() =>
      validateBody(CreateAppUserDto, {
        name: 'n',
        description: 'x'.repeat(201),
      }),
    );

    expect(messages).toEqual([
      'description must be shorter than or equal to 200 characters',
    ]);
  });

  it('strips unknown properties such as a caller-chosen clienteId', async () => {
    const dto = await validateBody(CreateAppUserDto, {
      name: 'n',
      description: 'd',
      clienteId: 'mine',
      clienteSecret: 'mine',
    });

    expect(dto).toBeInstanceOf(CreateAppUserDto);
    expect(dto).toEqual({ name: 'n', description: 'd' });
  });
});
