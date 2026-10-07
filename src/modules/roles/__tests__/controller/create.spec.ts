import { beforeEach, describe, expect, it } from '@jest/globals';
import { RequestMethod } from '@nestjs/common';
import {
  basePathOf,
  bodyParamsOf,
  routeOf,
} from '../../../../../test/helpers/route-metadata';
import { mockFn } from '../../../../../test/helpers/mocks';
import { Role } from '../../../../common/database/role/role.enum';
import { CreateRoleDto } from '../../dto/create-role.dto';
import { RolesController } from '../../roles.controller';
import { RolesService } from '../../roles.service';

describe('RolesController.create', () => {
  let service: { create: ReturnType<typeof mockFn> };
  let controller: RolesController;

  beforeEach(() => {
    service = { create: mockFn() };
    controller = new RolesController(service as unknown as RolesService);
  });

  it('delegates to RolesService.create and returns its result', async () => {
    const dto = { applicationId: 1, name: 'ADMIN', description: 'Admin' };
    const result = { msg: 'ok', data: [] };
    service.create.mockResolvedValue(result);

    await expect(controller.create(dto)).resolves.toBe(result);

    expect(service.create).toHaveBeenCalledTimes(1);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('propagates a service rejection', async () => {
    const dto = { applicationId: 1, name: 'ADMIN', description: 'Admin' };
    const failure = new Error('boom');
    service.create.mockRejectedValue(failure);

    await expect(controller.create(dto)).rejects.toBe(failure);
  });

  it('is mounted at POST /roles', () => {
    const info = routeOf(RolesController, 'create');

    expect(basePathOf(RolesController)).toBe('roles');
    expect(info.method).toBe(RequestMethod.POST);
    expect(info.path).toBe('/');
  });

  it('answers with status 201', () => {
    expect(routeOf(RolesController, 'create').httpCode).toBe(201);
  });

  it('requires the ADMIN role', () => {
    const info = routeOf(RolesController, 'create');

    expect(info.roles).toEqual([Role.ADMIN]);
    expect(info.isPublic).toBeUndefined();
  });

  it('reads the body as CreateRoleDto', () => {
    const params = bodyParamsOf(RolesController, 'create');
    const types = Reflect.getMetadata(
      'design:paramtypes',
      RolesController.prototype,
      'create',
    );

    expect(params).toHaveLength(1);
    expect(types[params[0].index]).toBe(CreateRoleDto);
  });
});
