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
import { CreateConnectionDto } from '../../../../common/dto/create-connection.dto';
import { AppUsersController } from '../../apps-users.controller';
import { AppUsersService } from '../../apps-users.service';

describe('AppUsersController.createConnection', () => {
  let service: { createConnection: ReturnType<typeof mockFn> };
  let controller: AppUsersController;

  beforeEach(() => {
    service = { createConnection: mockFn() };
    controller = new AppUsersController(service as unknown as AppUsersService);
  });

  it('delegates to AppUsersService.createConnection and returns its result', async () => {
    const dto = { originApplicationId: 1, destinationApplicationId: 2 };
    const result = { msg: 'ok', data: [] };
    service.createConnection.mockResolvedValue(result);

    await expect(controller.createConnection(7, dto)).resolves.toBe(result);

    expect(service.createConnection).toHaveBeenCalledTimes(1);
    expect(service.createConnection).toHaveBeenCalledWith(7, dto);
  });

  it('propagates a service rejection', async () => {
    const dto = { originApplicationId: 1, destinationApplicationId: 2 };
    const failure = new Error('boom');
    service.createConnection.mockRejectedValue(failure);

    await expect(controller.createConnection(7, dto)).rejects.toBe(failure);
  });

  it('is mounted at POST /apps-users/:id/connections', () => {
    const info = routeOf(AppUsersController, 'createConnection');

    expect(basePathOf(AppUsersController)).toBe('apps-users');
    expect(info.method).toBe(RequestMethod.POST);
    expect(info.path).toBe(':id/connections');
  });

  it('answers with status 201', () => {
    expect(routeOf(AppUsersController, 'createConnection').httpCode).toBe(201);
  });

  it('requires the ADMIN role', () => {
    const info = routeOf(AppUsersController, 'createConnection');

    expect(info.roles).toEqual([Role.ADMIN]);
    expect(info.isPublic).toBeUndefined();
  });

  it('parses the :id path parameter with ParseIntPipe', () => {
    const params = pathParamsOf(AppUsersController, 'createConnection');

    expect(params).toHaveLength(1);
    expect(params[0].index).toBe(0);
    expect(params[0].data).toBe('id');
    expect(params[0].pipes).toContain(ParseIntPipe);
  });

  it('reads the body as CreateConnectionDto', () => {
    const params = bodyParamsOf(AppUsersController, 'createConnection');
    const types = Reflect.getMetadata(
      'design:paramtypes',
      AppUsersController.prototype,
      'createConnection',
    );

    expect(params).toHaveLength(1);
    expect(types[params[0].index]).toBe(CreateConnectionDto);
  });
});
