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
import { AppUsersController } from '../../apps-users.controller';
import { AppUsersService } from '../../apps-users.service';

describe('AppUsersController.assignApplication', () => {
  let service: { assignApplication: ReturnType<typeof mockFn> };
  let controller: AppUsersController;

  beforeEach(() => {
    service = { assignApplication: mockFn() };
    controller = new AppUsersController(service as unknown as AppUsersService);
  });

  it('delegates to AppUsersService.assignApplication and returns its result', async () => {
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

  it('is mounted at POST /apps-users/:id/applications', () => {
    const info = routeOf(AppUsersController, 'assignApplication');

    expect(basePathOf(AppUsersController)).toBe('apps-users');
    expect(info.method).toBe(RequestMethod.POST);
    expect(info.path).toBe(':id/applications');
  });

  it('answers with status 201', () => {
    expect(routeOf(AppUsersController, 'assignApplication').httpCode).toBe(201);
  });

  it('requires the ADMIN role', () => {
    const info = routeOf(AppUsersController, 'assignApplication');

    expect(info.roles).toEqual([Role.ADMIN]);
    expect(info.isPublic).toBeUndefined();
  });

  it('parses the :id path parameter with ParseIntPipe', () => {
    const params = pathParamsOf(AppUsersController, 'assignApplication');

    expect(params).toHaveLength(1);
    expect(params[0].index).toBe(0);
    expect(params[0].data).toBe('id');
    expect(params[0].pipes).toContain(ParseIntPipe);
  });

  it('reads the body as AssignApplicationDto', () => {
    const params = bodyParamsOf(AppUsersController, 'assignApplication');
    const types = Reflect.getMetadata(
      'design:paramtypes',
      AppUsersController.prototype,
      'assignApplication',
    );

    expect(params).toHaveLength(1);
    expect(types[params[0].index]).toBe(AssignApplicationDto);
  });
});
