import { beforeEach, describe, expect, it } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { mockFn } from '../../../../../test/helpers/mocks';
import { ApplicationsRepository } from '../../../../common/database/application/applications.repository';
import { RolesRepository } from '../../../../common/database/role/roles.repository';
import { AppUsersRepository } from '../../../../common/database/app-user/app-users.repository';
import { AppUserConnectionsRepository } from '../../../../common/database/app-user-connection/app-user-connections.repository';
import { AppUsersService } from '../../apps-users.service';

describe('AppUsersService.findConnections', () => {
  let users: { findById: ReturnType<typeof mockFn> };
  let applications: { findByIds: ReturnType<typeof mockFn> };
  let connections: { findAllByAppUserId: ReturnType<typeof mockFn> };
  let service: AppUsersService;

  beforeEach(() => {
    users = { findById: mockFn() };
    applications = { findByIds: mockFn() };
    connections = { findAllByAppUserId: mockFn() };
    service = new AppUsersService(
      users as unknown as AppUsersRepository,
      applications as unknown as ApplicationsRepository,
      {} as unknown as RolesRepository,
      {} as never,
      {} as never,
      connections as unknown as AppUserConnectionsRepository,
    );
    users.findById.mockResolvedValue({ id: 1 });
  });

  it('throws NotFound when the user does not exist', async () => {
    users.findById.mockResolvedValue(null);

    await expect(service.findConnections(1)).rejects.toThrow(
      new NotFoundException('Application user not found'),
    );
    expect(connections.findAllByAppUserId).not.toHaveBeenCalled();
  });

  it('returns the connections with the names of both applications', async () => {
    connections.findAllByAppUserId.mockResolvedValue([
      {
        id: 1,
        appUserId: 1,
        originApplicationId: 10,
        destinationApplicationId: 20,
      },
      {
        id: 2,
        appUserId: 1,
        originApplicationId: 10,
        destinationApplicationId: 30,
      },
    ]);
    applications.findByIds.mockResolvedValue([
      { id: 10, name: 'iam' },
      { id: 20, name: 'hub' },
      { id: 30, name: 'infra' },
    ]);

    await expect(service.findConnections(1)).resolves.toEqual({
      msg: 'Connections retrieved successfully',
      data: [
        {
          id: 1,
          originApplicationId: 10,
          originApplicationName: 'iam',
          destinationApplicationId: 20,
          destinationApplicationName: 'hub',
        },
        {
          id: 2,
          originApplicationId: 10,
          originApplicationName: 'iam',
          destinationApplicationId: 30,
          destinationApplicationName: 'infra',
        },
      ],
    });
    expect(connections.findAllByAppUserId).toHaveBeenCalledWith(1);
  });

  it('looks every application up once, even when it appears several times', async () => {
    connections.findAllByAppUserId.mockResolvedValue([
      {
        id: 1,
        appUserId: 1,
        originApplicationId: 10,
        destinationApplicationId: 20,
      },
      {
        id: 2,
        appUserId: 1,
        originApplicationId: 10,
        destinationApplicationId: 30,
      },
    ]);
    applications.findByIds.mockResolvedValue([]);

    await service.findConnections(1);

    expect(applications.findByIds).toHaveBeenCalledWith([10, 20, 30]);
  });

  it('returns an empty list for a user without connections', async () => {
    connections.findAllByAppUserId.mockResolvedValue([]);
    applications.findByIds.mockResolvedValue([]);

    await expect(service.findConnections(1)).resolves.toEqual({
      msg: 'Connections retrieved successfully',
      data: [],
    });
    expect(applications.findByIds).toHaveBeenCalledWith([]);
  });

  it('leaves the application name undefined when the application no longer exists (current behavior)', async () => {
    connections.findAllByAppUserId.mockResolvedValue([
      {
        id: 1,
        appUserId: 1,
        originApplicationId: 10,
        destinationApplicationId: 20,
      },
    ]);
    applications.findByIds.mockResolvedValue([{ id: 10, name: 'iam' }]);

    const result = await service.findConnections(1);

    expect(result.data[0].destinationApplicationName).toBeUndefined();
  });

  it('propagates a repository failure', async () => {
    const failure = new Error('db down');
    connections.findAllByAppUserId.mockRejectedValue(failure);

    await expect(service.findConnections(1)).rejects.toBe(failure);
  });
});
