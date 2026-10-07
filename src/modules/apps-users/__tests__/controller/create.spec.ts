import { beforeEach, describe, expect, it } from '@jest/globals';
import { RequestMethod } from '@nestjs/common';
import {
  basePathOf,
  bodyParamsOf,
  routeOf,
} from '../../../../../test/helpers/route-metadata';
import { mockFn } from '../../../../../test/helpers/mocks';
import { Role } from '../../../../common/database/role/role.enum';
import { CreateAppUserDto } from '../../dto/create-app-user.dto';
import { AppUsersController } from '../../apps-users.controller';
import { AppUsersService } from '../../apps-users.service';

describe('AppUsersController.create', () => {
  let service: { create: ReturnType<typeof mockFn> };
  let controller: AppUsersController;

  beforeEach(() => {
    service = { create: mockFn() };
    controller = new AppUsersController(service as unknown as AppUsersService);
  });

  it('delegates to AppUsersService.create and returns its result', async () => {
    const dto = { name: 'Billing', description: 'Billing service' };
    const result = { msg: 'ok', data: [] };
    service.create.mockResolvedValue(result);

    await expect(controller.create(dto)).resolves.toBe(result);

    expect(service.create).toHaveBeenCalledTimes(1);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('propagates a service rejection', async () => {
    const dto = { name: 'Billing', description: 'Billing service' };
    const failure = new Error('boom');
    service.create.mockRejectedValue(failure);

    await expect(controller.create(dto)).rejects.toBe(failure);
  });

  it('is mounted at POST /apps-users', () => {
    const info = routeOf(AppUsersController, 'create');

    expect(basePathOf(AppUsersController)).toBe('apps-users');
    expect(info.method).toBe(RequestMethod.POST);
    expect(info.path).toBe('/');
  });

  it('answers with status 201', () => {
    expect(routeOf(AppUsersController, 'create').httpCode).toBe(201);
  });

  it('requires the ADMIN role', () => {
    const info = routeOf(AppUsersController, 'create');

    expect(info.roles).toEqual([Role.ADMIN]);
    expect(info.isPublic).toBeUndefined();
  });

  it('reads the body as CreateAppUserDto', () => {
    const params = bodyParamsOf(AppUsersController, 'create');
    const types = Reflect.getMetadata(
      'design:paramtypes',
      AppUsersController.prototype,
      'create',
    );

    expect(params).toHaveLength(1);
    expect(types[params[0].index]).toBe(CreateAppUserDto);
  });
});
