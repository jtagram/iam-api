import { describe, expect, it } from '@jest/globals';
import {
  validateQuery,
  validationMessages,
} from '../../../../../test/helpers/validation';
import { FindInternalUsersByRoleDto } from '../../dto/find-internal-users-by-role.dto';

describe('FindInternalUsersByRoleDto', () => {
  it('accepts an application name and a comma-separated list of roles', async () => {
    const dto = await validateQuery(FindInternalUsersByRoleDto, {
      applicationName: 'ticket-hub',
      roles: 'ADMIN,APPROVER',
    });

    expect(dto).toBeInstanceOf(FindInternalUsersByRoleDto);
    expect(dto).toEqual({
      applicationName: 'ticket-hub',
      roles: 'ADMIN,APPROVER',
    });
  });

  it('accepts an application name of exactly 15 characters', async () => {
    const dto = await validateQuery(FindInternalUsersByRoleDto, {
      applicationName: 'x'.repeat(15),
      roles: 'ADMIN',
    });

    expect(dto).toBeInstanceOf(FindInternalUsersByRoleDto);
  });

  it('rejects a missing applicationName', async () => {
    const messages = await validationMessages(() =>
      validateQuery(FindInternalUsersByRoleDto, { roles: 'ADMIN' }),
    );

    expect(messages).toEqual([
      'applicationName must be shorter than or equal to 15 characters',
      'applicationName should not be empty',
      'applicationName must be a string',
    ]);
  });

  it('rejects an empty applicationName', async () => {
    const messages = await validationMessages(() =>
      validateQuery(FindInternalUsersByRoleDto, {
        applicationName: '',
        roles: 'ADMIN',
      }),
    );

    expect(messages).toEqual(['applicationName should not be empty']);
  });

  it('rejects an applicationName longer than 15 characters', async () => {
    const messages = await validationMessages(() =>
      validateQuery(FindInternalUsersByRoleDto, {
        applicationName: 'x'.repeat(16),
        roles: 'ADMIN',
      }),
    );

    expect(messages).toEqual([
      'applicationName must be shorter than or equal to 15 characters',
    ]);
  });

  it('rejects a missing roles value', async () => {
    const messages = await validationMessages(() =>
      validateQuery(FindInternalUsersByRoleDto, {
        applicationName: 'ticket-hub',
      }),
    );

    expect(messages).toEqual([
      'roles should not be empty',
      'roles must be a string',
    ]);
  });

  it('rejects an empty roles value', async () => {
    const messages = await validationMessages(() =>
      validateQuery(FindInternalUsersByRoleDto, {
        applicationName: 'ticket-hub',
        roles: '',
      }),
    );

    expect(messages).toEqual(['roles should not be empty']);
  });

  it('rejects roles sent as a repeated query parameter (array)', async () => {
    const messages = await validationMessages(() =>
      validateQuery(FindInternalUsersByRoleDto, {
        applicationName: 'ticket-hub',
        roles: ['ADMIN', 'APPROVER'],
      }),
    );

    expect(messages).toEqual(['roles must be a string']);
  });
});
