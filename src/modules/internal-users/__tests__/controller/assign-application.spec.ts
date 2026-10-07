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
import { AssignApplicationDto } from '../../../../common/dto/assign-application.dto';
import { InternalUsersController } from '../../internal-users.controller';
import { InternalUsersService } from '../../internal-users.service';

describe('InternalUsersController.assignApplication', () => {
  let service: { assignApplication: ReturnType<typeof mockFn> };
  let controller: InternalUsersController;

  beforeEach(() => {
    service = { assignApplication: mockFn() };
    controller = new InternalUsersController(
      service as unknown as InternalUsersService,
    );
  });

  it('delegates to InternalUsersService.assignApplication and returns its result', async () => {
    const dto = { applicationId: 5 };
    const result = { msg: 'ok', data: [] };
    service.assignApplication.mockResolvedValue(result);

    await expect(controller.assignApplication(7, dto)).resolves.toBe(result);

    expect(service.assignApplication).toHaveBeenCalledTimes(1);
    expect(service.assignApplication).toHaveBeenCalledWith(7, dto);
  });

  it('propagates a service rejection', async () => {
    const dto = { applicationId: 5 };
    const failure = new Error('boom');
    service.assignApplication.mockRejectedValue(failure);

    await expect(controller.assignApplication(7, dto)).rejects.toBe(failure);
  });

  it('is mounted at POST /internal-users/:id/applications', () => {
    const info = routeOf(InternalUsersController, 'assignApplication');

    expect(basePathOf(InternalUsersController)).toBe('internal-users');
    expect(info.method).toBe(RequestMethod.POST);
    expect(info.path).toBe(':id/applications');
  });

  it('answers with status 201', () => {
    expect(routeOf(InternalUsersController, 'assignApplication').httpCode).toBe(
      201,
    );
  });

  it('requires the ADMIN role', () => {
    const info = routeOf(InternalUsersController, 'assignApplication');

    expect(info.roles).toEqual([Role.ADMIN]);
    expect(info.isPublic).toBeUndefined();
  });

  it('parses the :id path parameter with ParseIntPipe', () => {
    const params = pathParamsOf(InternalUsersController, 'assignApplication');

    expect(params).toHaveLength(1);
    expect(params[0].index).toBe(0);
    expect(params[0].data).toBe('id');
    expect(params[0].pipes).toContain(ParseIntPipe);
  });

  it('reads the body as AssignApplicationDto', () => {
    const params = bodyParamsOf(InternalUsersController, 'assignApplication');
    const types = Reflect.getMetadata(
      'design:paramtypes',
      InternalUsersController.prototype,
      'assignApplication',
    );

    expect(params).toHaveLength(1);
    expect(types[params[0].index]).toBe(AssignApplicationDto);
  });
});
