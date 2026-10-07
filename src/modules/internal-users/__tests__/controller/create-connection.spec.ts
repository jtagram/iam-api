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
import { InternalUsersController } from '../../internal-users.controller';
import { InternalUsersService } from '../../internal-users.service';

describe('InternalUsersController.createConnection', () => {
  let service: { createConnection: ReturnType<typeof mockFn> };
  let controller: InternalUsersController;

  beforeEach(() => {
    service = { createConnection: mockFn() };
    controller = new InternalUsersController(
      service as unknown as InternalUsersService,
    );
  });

  it('delegates to InternalUsersService.createConnection and returns its result', async () => {
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

  it('is mounted at POST /internal-users/:id/connections', () => {
    const info = routeOf(InternalUsersController, 'createConnection');

    expect(basePathOf(InternalUsersController)).toBe('internal-users');
    expect(info.method).toBe(RequestMethod.POST);
    expect(info.path).toBe(':id/connections');
  });

  it('answers with status 201', () => {
    expect(routeOf(InternalUsersController, 'createConnection').httpCode).toBe(
      201,
    );
  });

  it('requires the ADMIN role', () => {
    const info = routeOf(InternalUsersController, 'createConnection');

    expect(info.roles).toEqual([Role.ADMIN]);
    expect(info.isPublic).toBeUndefined();
  });

  it('parses the :id path parameter with ParseIntPipe', () => {
    const params = pathParamsOf(InternalUsersController, 'createConnection');

    expect(params).toHaveLength(1);
    expect(params[0].index).toBe(0);
    expect(params[0].data).toBe('id');
    expect(params[0].pipes).toContain(ParseIntPipe);
  });

  it('reads the body as CreateConnectionDto', () => {
    const params = bodyParamsOf(InternalUsersController, 'createConnection');
    const types = Reflect.getMetadata(
      'design:paramtypes',
      InternalUsersController.prototype,
      'createConnection',
    );

    expect(params).toHaveLength(1);
    expect(types[params[0].index]).toBe(CreateConnectionDto);
  });
});
