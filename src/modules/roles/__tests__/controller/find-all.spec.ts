import { beforeEach, describe, expect, it } from '@jest/globals';
import { RequestMethod } from '@nestjs/common';
import {
  basePathOf,
  queryParamsOf,
  routeOf,
} from '../../../../../test/helpers/route-metadata';
import { mockFn } from '../../../../../test/helpers/mocks';
import { Role } from '../../../../common/database/role/role.enum';
import { FindRolesQueryDto } from '../../dto/find-roles-query.dto';
import { RolesController } from '../../roles.controller';
import { RolesService } from '../../roles.service';

describe('RolesController.findAll', () => {
  let service: { findAllByApplicationId: ReturnType<typeof mockFn> };
  let controller: RolesController;

  beforeEach(() => {
    service = { findAllByApplicationId: mockFn() };
    controller = new RolesController(service as unknown as RolesService);
  });

  it('delegates to RolesService.findAllByApplicationId and returns its result', async () => {
    const query = { applicationId: 1 };
    const result = { msg: 'ok', data: [] };
    service.findAllByApplicationId.mockResolvedValue(result);

    await expect(controller.findAll(query)).resolves.toBe(result);

    expect(service.findAllByApplicationId).toHaveBeenCalledTimes(1);
    expect(service.findAllByApplicationId).toHaveBeenCalledWith(query);
  });

  it('propagates a service rejection', async () => {
    const query = { applicationId: 1 };
    const failure = new Error('boom');
    service.findAllByApplicationId.mockRejectedValue(failure);

    await expect(controller.findAll(query)).rejects.toBe(failure);
  });

  it('is mounted at GET /roles', () => {
    const info = routeOf(RolesController, 'findAll');

    expect(basePathOf(RolesController)).toBe('roles');
    expect(info.method).toBe(RequestMethod.GET);
    expect(info.path).toBe('/');
  });

  it('keeps the default status code of the verb', () => {
    expect(routeOf(RolesController, 'findAll').httpCode).toBeUndefined();
  });

  it('requires the ADMIN role', () => {
    const info = routeOf(RolesController, 'findAll');

    expect(info.roles).toEqual([Role.ADMIN]);
    expect(info.isPublic).toBeUndefined();
  });

  it('reads the query string as FindRolesQueryDto', () => {
    const params = queryParamsOf(RolesController, 'findAll');
    const types = Reflect.getMetadata(
      'design:paramtypes',
      RolesController.prototype,
      'findAll',
    );

    expect(params).toHaveLength(1);
    expect(types[params[0].index]).toBe(FindRolesQueryDto);
  });
});
