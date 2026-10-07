import { describe, expect, it } from '@jest/globals';
import {
  validateBody,
  validationMessages,
} from '../../../../test/helpers/validation';
import { AssignRoleDto } from '../assign-role.dto';

describe('AssignRoleDto', () => {
  it('accepts an integer roleId', async () => {
    const dto = await validateBody(AssignRoleDto, { roleId: 7 });

    expect(dto).toBeInstanceOf(AssignRoleDto);
    expect(dto.roleId).toBe(7);
  });

  it('rejects a missing roleId', async () => {
    const messages = await validationMessages(() =>
      validateBody(AssignRoleDto, {}),
    );

    expect(messages).toEqual(['roleId must be an integer number']);
  });

  it('rejects a decimal roleId', async () => {
    const messages = await validationMessages(() =>
      validateBody(AssignRoleDto, { roleId: 2.2 }),
    );

    expect(messages).toEqual(['roleId must be an integer number']);
  });

  it('rejects a string roleId', async () => {
    const messages = await validationMessages(() =>
      validateBody(AssignRoleDto, { roleId: 'ADMIN' }),
    );

    expect(messages).toEqual(['roleId must be an integer number']);
  });

  it('strips a caller-supplied applicationId (it is derived from the role)', async () => {
    const dto = await validateBody(AssignRoleDto, {
      roleId: 7,
      applicationId: 99,
    });

    expect(dto).toEqual({ roleId: 7 });
  });
});
