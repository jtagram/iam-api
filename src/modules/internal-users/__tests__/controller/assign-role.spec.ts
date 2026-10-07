import { beforeEach, describe, expect, it } from '@jest/globals';
import { RequestMethod, ParseIntPipe } from '@nestjs/common';
import {
  basePathOf,
  bodyParamsOf,
  pathParamsOf,
  routeOf,
} from '../../../../../test/helpers/route-metadata';
import { mockFn } from '../../../../../test/helpers/mocks';
import { Role } from '../../../../common/database/role/role.enum';
import { AssignRoleDto } from '../../../../common/dto/assign-role.dto';
import { InternalUsersController } from '../../internal-users.controller';
import { InternalUsersService } from '../../internal-users.service';

describe('InternalUsersController.assignRole', () => {
  let service: { assignRole: ReturnType<typeof mockFn> };
  let controller: InternalUsersController;

  beforeEach(() => {
    service = { assignRole: mockFn() };
    controller = new InternalUsersController(
      service as unknown as InternalUsersService,
    );
  });

  it('delegates to InternalUsersService.assignRole and returns its result', async () => {
    const dto = { roleId: 9 };
    const result = { msg: 'ok', data: [] };
    service.assignRole.mockResolvedValue(result);

    await expect(controller.assignRole(7, dto)).resolves.toBe(result);

    expect(service.assignRole).toHaveBeenCalledTimes(1);
    expect(service.assignRole).toHaveBeenCalledWith(7, dto);
  });

  it('propagates a service rejection', async () => {
    const dto = { roleId: 9 };
    const failure = new Error('boom');
    service.assignRole.mockRejectedValue(failure);

    await expect(controller.assignRole(7, dto)).rejects.toBe(failure);
  });

  it('is mounted at POST /internal-users/:id/roles', () => {
    const info = routeOf(InternalUsersController, 'assignRole');

    expect(basePathOf(InternalUsersController)).toBe('internal-users');
    expect(info.method).toBe(RequestMethod.POST);
    expect(info.path).toBe(':id/roles');
  });

  it('answers with status 201', () => {
    expect(routeOf(InternalUsersController, 'assignRole').httpCode).toBe(201);
  });

  it('requires the ADMIN role', () => {
    const info = routeOf(InternalUsersController, 'assignRole');

    expect(info.roles).toEqual([Role.ADMIN]);
    expect(info.isPublic).toBeUndefined();
  });

  it('parses the :id path parameter with ParseIntPipe', () => {
    const params = pathParamsOf(InternalUsersController, 'assignRole');

    expect(params).toHaveLength(1);
    expect(params[0].index).toBe(0);
    expect(params[0].data).toBe('id');
    expect(params[0].pipes).toContain(ParseIntPipe);
  });

  it('reads the body as AssignRoleDto', () => {
    const params = bodyParamsOf(InternalUsersController, 'assignRole');
    const types = Reflect.getMetadata(
      'design:paramtypes',
      InternalUsersController.prototype,
      'assignRole',
    );

    expect(params).toHaveLength(1);
    expect(types[params[0].index]).toBe(AssignRoleDto);
  });
});
