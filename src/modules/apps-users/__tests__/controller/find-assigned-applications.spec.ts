import { beforeEach, describe, expect, it } from '@jest/globals';
import { RequestMethod, ParseIntPipe } from '@nestjs/common';
import {
  basePathOf,
  pathParamsOf,
  routeOf,
} from '../../../../../test/helpers/route-metadata';
import { mockFn } from '../../../../../test/helpers/mocks';
import { Role } from '../../../../common/database/role/role.enum';
import { AppUsersController } from '../../apps-users.controller';
import { AppUsersService } from '../../apps-users.service';

describe('AppUsersController.findAssignedApplications', () => {
  let service: { findAssignedApplications: ReturnType<typeof mockFn> };
  let controller: AppUsersController;

  beforeEach(() => {
    service = { findAssignedApplications: mockFn() };
    controller = new AppUsersController(service as unknown as AppUsersService);
  });

  it('delegates to AppUsersService.findAssignedApplications and returns its result', async () => {
    const result = { msg: 'ok', data: [] };
    service.findAssignedApplications.mockResolvedValue(result);

    await expect(controller.findAssignedApplications(7)).resolves.toBe(result);

    expect(service.findAssignedApplications).toHaveBeenCalledTimes(1);
    expect(service.findAssignedApplications).toHaveBeenCalledWith(7);
  });

  it('propagates a service rejection', async () => {
    const failure = new Error('boom');
    service.findAssignedApplications.mockRejectedValue(failure);

    await expect(controller.findAssignedApplications(7)).rejects.toBe(failure);
  });

  it('is mounted at GET /apps-users/:id/applications', () => {
    const info = routeOf(AppUsersController, 'findAssignedApplications');

    expect(basePathOf(AppUsersController)).toBe('apps-users');
    expect(info.method).toBe(RequestMethod.GET);
    expect(info.path).toBe(':id/applications');
  });

  it('keeps the default status code of the verb', () => {
    expect(
      routeOf(AppUsersController, 'findAssignedApplications').httpCode,
    ).toBeUndefined();
  });

  it('requires the ADMIN role', () => {
    const info = routeOf(AppUsersController, 'findAssignedApplications');

    expect(info.roles).toEqual([Role.ADMIN]);
    expect(info.isPublic).toBeUndefined();
  });

  it('parses the :id path parameter with ParseIntPipe', () => {
    const params = pathParamsOf(AppUsersController, 'findAssignedApplications');

    expect(params).toHaveLength(1);
    expect(params[0].index).toBe(0);
    expect(params[0].data).toBe('id');
    expect(params[0].pipes).toContain(ParseIntPipe);
  });
});
