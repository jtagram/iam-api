import { beforeEach, describe, expect, it } from '@jest/globals';
import { RequestMethod } from '@nestjs/common';
import {
  basePathOf,
  queryParamsOf,
  routeOf,
} from '../../../../../test/helpers/route-metadata';
import { mockFn } from '../../../../../test/helpers/mocks';
import { Role } from '../../../../common/database/role/role.enum';
import { FindInternalUsersByRoleDto } from '../../dto/find-internal-users-by-role.dto';
import { InternalUsersController } from '../../internal-users.controller';
import { InternalUsersService } from '../../internal-users.service';

describe('InternalUsersController.findByApplicationAndRoles', () => {
  let service: { findByApplicationAndRoles: ReturnType<typeof mockFn> };
  let controller: InternalUsersController;

  beforeEach(() => {
    service = { findByApplicationAndRoles: mockFn() };
    controller = new InternalUsersController(
      service as unknown as InternalUsersService,
    );
  });

  it('delegates to InternalUsersService.findByApplicationAndRoles and returns its result', async () => {
    const query = { applicationName: 'ticket-hub', roles: 'ADMIN' };
    const result = { msg: 'ok', data: [] };
    service.findByApplicationAndRoles.mockResolvedValue(result);

    await expect(controller.findByApplicationAndRoles(query)).resolves.toBe(
      result,
    );

    expect(service.findByApplicationAndRoles).toHaveBeenCalledTimes(1);
    expect(service.findByApplicationAndRoles).toHaveBeenCalledWith(query);
  });

  it('propagates a service rejection', async () => {
    const query = { applicationName: 'ticket-hub', roles: 'ADMIN' };
    const failure = new Error('boom');
    service.findByApplicationAndRoles.mockRejectedValue(failure);

    await expect(controller.findByApplicationAndRoles(query)).rejects.toBe(
      failure,
    );
  });

  it('is mounted at GET /internal-users/by-role', () => {
    const info = routeOf(InternalUsersController, 'findByApplicationAndRoles');

    expect(basePathOf(InternalUsersController)).toBe('internal-users');
    expect(info.method).toBe(RequestMethod.GET);
    expect(info.path).toBe('by-role');
  });

  it('keeps the default status code of the verb', () => {
    expect(
      routeOf(InternalUsersController, 'findByApplicationAndRoles').httpCode,
    ).toBeUndefined();
  });

  it('requires the ADMIN role', () => {
    const info = routeOf(InternalUsersController, 'findByApplicationAndRoles');

    expect(info.roles).toEqual([Role.ADMIN]);
    expect(info.isPublic).toBeUndefined();
  });

  it('reads the query string as FindInternalUsersByRoleDto', () => {
    const params = queryParamsOf(
      InternalUsersController,
      'findByApplicationAndRoles',
    );
    const types = Reflect.getMetadata(
      'design:paramtypes',
      InternalUsersController.prototype,
      'findByApplicationAndRoles',
    );

    expect(params).toHaveLength(1);
    expect(types[params[0].index]).toBe(FindInternalUsersByRoleDto);
  });
});
