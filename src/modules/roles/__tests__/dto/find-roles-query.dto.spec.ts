import { describe, expect, it } from '@jest/globals';
import {
  validateQuery,
  validationMessages,
} from '../../../../../test/helpers/validation';
import { FindRolesQueryDto } from '../../dto/find-roles-query.dto';

describe('FindRolesQueryDto', () => {
  it('converts a numeric query string to a number', async () => {
    const dto = await validateQuery(FindRolesQueryDto, { applicationId: '5' });

    expect(dto).toBeInstanceOf(FindRolesQueryDto);
    expect(dto.applicationId).toBe(5);
  });

  it('accepts a real number too', async () => {
    const dto = await validateQuery(FindRolesQueryDto, { applicationId: 5 });

    expect(dto).toBeInstanceOf(FindRolesQueryDto);
    expect(dto.applicationId).toBe(5);
  });

  it('rejects a missing applicationId', async () => {
    const messages = await validationMessages(() =>
      validateQuery(FindRolesQueryDto, {}),
    );

    expect(messages).toEqual(['applicationId must be an integer number']);
  });

  it('rejects a non-numeric string', async () => {
    const messages = await validationMessages(() =>
      validateQuery(FindRolesQueryDto, { applicationId: 'abc' }),
    );

    expect(messages).toEqual(['applicationId must be an integer number']);
  });

  it('rejects a decimal string', async () => {
    const messages = await validationMessages(() =>
      validateQuery(FindRolesQueryDto, { applicationId: '1.5' }),
    );

    expect(messages).toEqual(['applicationId must be an integer number']);
  });

  it('strips unknown properties', async () => {
    const dto = await validateQuery(FindRolesQueryDto, {
      applicationId: '5',
      extra: 'x',
    });

    expect(dto).toBeInstanceOf(FindRolesQueryDto);
    expect(dto).toEqual({ applicationId: 5 });
  });
});
