import { beforeEach, describe, expect, it } from '@jest/globals';
import { RequestMethod } from '@nestjs/common';
import {
  basePathOf,
  routeOf,
} from '../../../../../test/helpers/route-metadata';
import { mockFn } from '../../../../../test/helpers/mocks';
import { Role } from '../../../../common/database/role/role.enum';
import { ApplicationsController } from '../../applications.controller';
import { ApplicationsService } from '../../applications.service';

describe('ApplicationsController.findAll', () => {
  let service: { findAll: ReturnType<typeof mockFn> };
  let controller: ApplicationsController;

  beforeEach(() => {
    service = { findAll: mockFn() };
    controller = new ApplicationsController(
      service as unknown as ApplicationsService,
    );
  });

  it('delegates to ApplicationsService.findAll and returns its result', async () => {
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

  it('is mounted at GET /applications', () => {
    const info = routeOf(ApplicationsController, 'findAll');

    expect(basePathOf(ApplicationsController)).toBe('applications');
    expect(info.method).toBe(RequestMethod.GET);
    expect(info.path).toBe('/');
  });

  it('keeps the default status code of the verb', () => {
    expect(routeOf(ApplicationsController, 'findAll').httpCode).toBeUndefined();
  });

  it('requires the ADMIN role', () => {
    const info = routeOf(ApplicationsController, 'findAll');

    expect(info.roles).toEqual([Role.ADMIN]);
    expect(info.isPublic).toBeUndefined();
  });
});
