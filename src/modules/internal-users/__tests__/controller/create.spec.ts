import { beforeEach, describe, expect, it } from '@jest/globals';
import { RequestMethod } from '@nestjs/common';
import {
  basePathOf,
  bodyParamsOf,
  routeOf,
} from '../../../../../test/helpers/route-metadata';
import { mockFn } from '../../../../../test/helpers/mocks';
import { Role } from '../../../../common/database/role/role.enum';
import { CreateInternalUserDto } from '../../dto/create-internal-user.dto';
import { InternalUsersController } from '../../internal-users.controller';
import { InternalUsersService } from '../../internal-users.service';

describe('InternalUsersController.create', () => {
  let service: { create: ReturnType<typeof mockFn> };
  let controller: InternalUsersController;

  beforeEach(() => {
    service = { create: mockFn() };
    controller = new InternalUsersController(
      service as unknown as InternalUsersService,
    );
  });

  it('delegates to InternalUsersService.create and returns its result', async () => {
    const dto = {
      name: 'Ada',
      lastname: 'L',
      email: 'a@example.com',
      password: 'secret123',
    };
    const result = { msg: 'ok', data: [] };
    service.create.mockResolvedValue(result);

    await expect(controller.create(dto)).resolves.toBe(result);

    expect(service.create).toHaveBeenCalledTimes(1);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('propagates a service rejection', async () => {
    const dto = {
      name: 'Ada',
      lastname: 'L',
      email: 'a@example.com',
      password: 'secret123',
    };
    const failure = new Error('boom');
    service.create.mockRejectedValue(failure);

    await expect(controller.create(dto)).rejects.toBe(failure);
  });

  it('is mounted at POST /internal-users', () => {
    const info = routeOf(InternalUsersController, 'create');

    expect(basePathOf(InternalUsersController)).toBe('internal-users');
    expect(info.method).toBe(RequestMethod.POST);
    expect(info.path).toBe('/');
  });

  it('answers with status 201', () => {
    expect(routeOf(InternalUsersController, 'create').httpCode).toBe(201);
  });

  it('requires the ADMIN role', () => {
    const info = routeOf(InternalUsersController, 'create');

    expect(info.roles).toEqual([Role.ADMIN]);
    expect(info.isPublic).toBeUndefined();
  });

  it('reads the body as CreateInternalUserDto', () => {
    const params = bodyParamsOf(InternalUsersController, 'create');
    const types = Reflect.getMetadata(
      'design:paramtypes',
      InternalUsersController.prototype,
      'create',
    );

    expect(params).toHaveLength(1);
    expect(types[params[0].index]).toBe(CreateInternalUserDto);
  });
});
