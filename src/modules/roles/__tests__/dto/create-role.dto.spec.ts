import { describe, expect, it } from '@jest/globals';
import {
  validateBody,
  validationMessages,
} from '../../../../../test/helpers/validation';
import { CreateRoleDto } from '../../dto/create-role.dto';

describe('CreateRoleDto', () => {
  it('accepts an application id, a name and a description', async () => {
    const dto = await validateBody(CreateRoleDto, {
      applicationId: 1,
      name: 'ADMIN',
      description: 'Admin',
    });

    expect(dto).toBeInstanceOf(CreateRoleDto);
    expect(dto).toEqual({
      applicationId: 1,
      name: 'ADMIN',
      description: 'Admin',
    });
  });

  it('accepts a name of exactly 20 characters', async () => {
    const dto = await validateBody(CreateRoleDto, {
      applicationId: 1,
      name: 'x'.repeat(20),
      description: 'd',
    });

    expect(dto).toBeInstanceOf(CreateRoleDto);
  });

  it('rejects a missing applicationId', async () => {
    const messages = await validationMessages(() =>
      validateBody(CreateRoleDto, { name: 'ADMIN', description: 'd' }),
    );

    expect(messages).toEqual(['applicationId must be an integer number']);
  });

  it('rejects a decimal applicationId', async () => {
    const messages = await validationMessages(() =>
      validateBody(CreateRoleDto, {
        applicationId: 1.5,
        name: 'ADMIN',
        description: 'd',
      }),
    );

    expect(messages).toEqual(['applicationId must be an integer number']);
  });

  it('rejects a numeric-string applicationId in the body', async () => {
    const messages = await validationMessages(() =>
      validateBody(CreateRoleDto, {
        applicationId: '1',
        name: 'ADMIN',
        description: 'd',
      }),
    );

    expect(messages).toEqual(['applicationId must be an integer number']);
  });

  it('rejects a missing name', async () => {
    const messages = await validationMessages(() =>
      validateBody(CreateRoleDto, { applicationId: 1, description: 'd' }),
    );

    expect(messages).toEqual([
      'name must be shorter than or equal to 20 characters',
      'name must be a string',
    ]);
  });

  it('rejects a name longer than 20 characters', async () => {
    const messages = await validationMessages(() =>
      validateBody(CreateRoleDto, {
        applicationId: 1,
        name: 'x'.repeat(21),
        description: 'd',
      }),
    );

    expect(messages).toEqual([
      'name must be shorter than or equal to 20 characters',
    ]);
  });

  it('rejects a description longer than 200 characters', async () => {
    const messages = await validationMessages(() =>
      validateBody(CreateRoleDto, {
        applicationId: 1,
        name: 'ADMIN',
        description: 'x'.repeat(201),
      }),
    );

    expect(messages).toEqual([
      'description must be shorter than or equal to 200 characters',
    ]);
  });

  it('rejects a missing description', async () => {
    const messages = await validationMessages(() =>
      validateBody(CreateRoleDto, { applicationId: 1, name: 'ADMIN' }),
    );

    expect(messages).toEqual([
      'description must be shorter than or equal to 200 characters',
      'description must be a string',
    ]);
  });

  it('strips unknown properties', async () => {
    const dto = await validateBody(CreateRoleDto, {
      applicationId: 1,
      name: 'ADMIN',
      description: 'd',
      id: 5,
    });

    expect(dto).toBeInstanceOf(CreateRoleDto);
    expect(dto).toEqual({ applicationId: 1, name: 'ADMIN', description: 'd' });
  });
});
