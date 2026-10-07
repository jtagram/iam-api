import { describe, expect, it } from '@jest/globals';
import {
  validateBody,
  validationMessages,
} from '../../../../../test/helpers/validation';
import { CreateApplicationDto } from '../../dto/create-application.dto';

describe('CreateApplicationDto', () => {
  it('accepts a name and a description', async () => {
    const dto = await validateBody(CreateApplicationDto, {
      name: 'iam',
      description: 'Identity',
    });

    expect(dto).toBeInstanceOf(CreateApplicationDto);
    expect(dto).toEqual({ name: 'iam', description: 'Identity' });
  });

  it('accepts a name of exactly 15 characters', async () => {
    const dto = await validateBody(CreateApplicationDto, {
      name: 'x'.repeat(15),
      description: 'd',
    });

    expect(dto).toBeInstanceOf(CreateApplicationDto);
  });

  it('accepts a description of exactly 200 characters', async () => {
    const dto = await validateBody(CreateApplicationDto, {
      name: 'iam',
      description: 'x'.repeat(200),
    });

    expect(dto).toBeInstanceOf(CreateApplicationDto);
  });

  it('accepts an empty name (current behavior, no IsNotEmpty)', async () => {
    const dto = await validateBody(CreateApplicationDto, {
      name: '',
      description: 'd',
    });

    expect(dto).toBeInstanceOf(CreateApplicationDto);
  });

  it('rejects a missing name', async () => {
    const messages = await validationMessages(() =>
      validateBody(CreateApplicationDto, { description: 'd' }),
    );

    expect(messages).toEqual([
      'name must be shorter than or equal to 15 characters',
      'name must be a string',
    ]);
  });

  it('rejects a non-string name', async () => {
    const messages = await validationMessages(() =>
      validateBody(CreateApplicationDto, { name: 5, description: 'd' }),
    );

    expect(messages).toEqual([
      'name must be shorter than or equal to 15 characters',
      'name must be a string',
    ]);
  });

  it('rejects a name longer than 15 characters', async () => {
    const messages = await validationMessages(() =>
      validateBody(CreateApplicationDto, {
        name: 'x'.repeat(16),
        description: 'd',
      }),
    );

    expect(messages).toEqual([
      'name must be shorter than or equal to 15 characters',
    ]);
  });

  it('rejects a missing description', async () => {
    const messages = await validationMessages(() =>
      validateBody(CreateApplicationDto, { name: 'iam' }),
    );

    expect(messages).toEqual([
      'description must be shorter than or equal to 200 characters',
      'description must be a string',
    ]);
  });

  it('rejects a description longer than 200 characters', async () => {
    const messages = await validationMessages(() =>
      validateBody(CreateApplicationDto, {
        name: 'iam',
        description: 'x'.repeat(201),
      }),
    );

    expect(messages).toEqual([
      'description must be shorter than or equal to 200 characters',
    ]);
  });

  it('strips unknown properties', async () => {
    const dto = await validateBody(CreateApplicationDto, {
      name: 'iam',
      description: 'd',
      id: 99,
    });

    expect(dto).toBeInstanceOf(CreateApplicationDto);
    expect(dto).toEqual({ name: 'iam', description: 'd' });
  });
});
