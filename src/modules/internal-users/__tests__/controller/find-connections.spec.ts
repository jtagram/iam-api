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

describe('InternalUsersController.findConnections', () => {
  let service: { findConnections: ReturnType<typeof mockFn> };
  let controller: InternalUsersController;

  beforeEach(() => {
    service = { findConnections: mockFn() };
    controller = new InternalUsersController(
      service as unknown as InternalUsersService,
    );
  });

  it('delegates to InternalUsersService.findConnections and returns its result', async () => {
    const result = { msg: 'ok', data: [] };
    service.findConnections.mockResolvedValue(result);

    await expect(controller.findConnections(7)).resolves.toBe(result);

    expect(service.findConnections).toHaveBeenCalledTimes(1);
    expect(service.findConnections).toHaveBeenCalledWith(7);
  });

  it('propagates a service rejection', async () => {
    const failure = new Error('boom');
    service.findConnections.mockRejectedValue(failure);

    await expect(controller.findConnections(7)).rejects.toBe(failure);
  });

  it('is mounted at GET /internal-users/:id/connections', () => {
    const info = routeOf(InternalUsersController, 'findConnections');

    expect(basePathOf(InternalUsersController)).toBe('internal-users');
    expect(info.method).toBe(RequestMethod.GET);
    expect(info.path).toBe(':id/connections');
  });

  it('keeps the default status code of the verb', () => {
    expect(
      routeOf(InternalUsersController, 'findConnections').httpCode,
    ).toBeUndefined();
  });

  it('requires the ADMIN role', () => {
    const info = routeOf(InternalUsersController, 'findConnections');

    expect(info.roles).toEqual([Role.ADMIN]);
    expect(info.isPublic).toBeUndefined();
  });

  it('parses the :id path parameter with ParseIntPipe', () => {
    const params = pathParamsOf(InternalUsersController, 'findConnections');

    expect(params).toHaveLength(1);
    expect(params[0].index).toBe(0);
    expect(params[0].data).toBe('id');
    expect(params[0].pipes).toContain(ParseIntPipe);
  });
});
