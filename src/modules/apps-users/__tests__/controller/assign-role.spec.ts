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
import { AppUsersController } from '../../apps-users.controller';
import { AppUsersService } from '../../apps-users.service';

describe('AppUsersController.assignRole', () => {
  let service: { assignRole: ReturnType<typeof mockFn> };
  let controller: AppUsersController;

  beforeEach(() => {
    service = { assignRole: mockFn() };
    controller = new AppUsersController(service as unknown as AppUsersService);
  });

  it('delegates to AppUsersService.assignRole and returns its result', async () => {
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

  it('is mounted at POST /apps-users/:id/roles', () => {
    const info = routeOf(AppUsersController, 'assignRole');

    expect(basePathOf(AppUsersController)).toBe('apps-users');
    expect(info.method).toBe(RequestMethod.POST);
    expect(info.path).toBe(':id/roles');
  });

  it('answers with status 201', () => {
    expect(routeOf(AppUsersController, 'assignRole').httpCode).toBe(201);
  });

  it('requires the ADMIN role', () => {
    const info = routeOf(AppUsersController, 'assignRole');

    expect(info.roles).toEqual([Role.ADMIN]);
    expect(info.isPublic).toBeUndefined();
  });

  it('parses the :id path parameter with ParseIntPipe', () => {
    const params = pathParamsOf(AppUsersController, 'assignRole');

    expect(params).toHaveLength(1);
    expect(params[0].index).toBe(0);
    expect(params[0].data).toBe('id');
    expect(params[0].pipes).toContain(ParseIntPipe);
  });

  it('reads the body as AssignRoleDto', () => {
    const params = bodyParamsOf(AppUsersController, 'assignRole');
    const types = Reflect.getMetadata(
      'design:paramtypes',
      AppUsersController.prototype,
      'assignRole',
    );

    expect(params).toHaveLength(1);
    expect(types[params[0].index]).toBe(AssignRoleDto);
  });
});
