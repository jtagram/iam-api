import { beforeEach, describe, expect, it } from '@jest/globals';
import { RequestMethod, ParseIntPipe } from '@nestjs/common';
import {
  basePathOf,
  pathParamsOf,
  routeOf,
} from '../../../../../test/helpers/route-metadata';
import { mockFn } from '../../../../../test/helpers/mocks';
import { Role } from '../../../../common/database/role/role.enum';
import { InternalUsersController } from '../../internal-users.controller';
import { InternalUsersService } from '../../internal-users.service';

describe('InternalUsersController.findAssignedApplications', () => {
  let service: { findAssignedApplications: ReturnType<typeof mockFn> };
  let controller: InternalUsersController;

  beforeEach(() => {
    service = { findAssignedApplications: mockFn() };
    controller = new InternalUsersController(
      service as unknown as InternalUsersService,
    );
  });

  it('delegates to InternalUsersService.findAssignedApplications and returns its result', async () => {
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

  it('is mounted at GET /internal-users/:id/applications', () => {
    const info = routeOf(InternalUsersController, 'findAssignedApplications');

    expect(basePathOf(InternalUsersController)).toBe('internal-users');
    expect(info.method).toBe(RequestMethod.GET);
    expect(info.path).toBe(':id/applications');
  });

  it('keeps the default status code of the verb', () => {
    expect(
      routeOf(InternalUsersController, 'findAssignedApplications').httpCode,
    ).toBeUndefined();
  });

  it('requires the ADMIN role', () => {
    const info = routeOf(InternalUsersController, 'findAssignedApplications');

    expect(info.roles).toEqual([Role.ADMIN]);
    expect(info.isPublic).toBeUndefined();
  });

  it('parses the :id path parameter with ParseIntPipe', () => {
    const params = pathParamsOf(
      InternalUsersController,
      'findAssignedApplications',
    );

    expect(params).toHaveLength(1);
    expect(params[0].index).toBe(0);
    expect(params[0].data).toBe('id');
    expect(params[0].pipes).toContain(ParseIntPipe);
  });
});
