import { beforeEach, describe, expect, it } from '@jest/globals';
import { RequestMethod } from '@nestjs/common';
import {
  basePathOf,
  routeOf,
} from '../../../../../test/helpers/route-metadata';
import { mockFn } from '../../../../../test/helpers/mocks';
import { Role } from '../../../../common/database/role/role.enum';
import { InternalUsersController } from '../../internal-users.controller';
import { InternalUsersService } from '../../internal-users.service';

describe('InternalUsersController.findAll', () => {
  let service: { findAll: ReturnType<typeof mockFn> };
  let controller: InternalUsersController;

  beforeEach(() => {
    service = { findAll: mockFn() };
    controller = new InternalUsersController(
      service as unknown as InternalUsersService,
    );
  });

  it('delegates to InternalUsersService.findAll and returns its result', async () => {
    const result = { msg: 'ok', data: [] };
    service.findAll.mockResolvedValue(result);

    await expect(controller.findAll()).resolves.toBe(result);

    expect(service.findAll).toHaveBeenCalledTimes(1);
    expect(service.findAll).toHaveBeenCalledWith();
  });

  it('propagates a service rejection', async () => {
    const failure = new Error('boom');
    service.findAll.mockRejectedValue(failure);

    await expect(controller.findAll()).rejects.toBe(failure);
  });

  it('is mounted at GET /internal-users', () => {
    const info = routeOf(InternalUsersController, 'findAll');

    expect(basePathOf(InternalUsersController)).toBe('internal-users');
    expect(info.method).toBe(RequestMethod.GET);
    expect(info.path).toBe('/');
  });

  it('keeps the default status code of the verb', () => {
    expect(
      routeOf(InternalUsersController, 'findAll').httpCode,
    ).toBeUndefined();
  });

  it('requires the ADMIN role', () => {
    const info = routeOf(InternalUsersController, 'findAll');

    expect(info.roles).toEqual([Role.ADMIN]);
    expect(info.isPublic).toBeUndefined();
  });
});
