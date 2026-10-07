import { beforeEach, describe, expect, it } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { mockFn } from '../../../../../test/helpers/mocks';
import { ApplicationsRepository } from '../../../../common/database/application/applications.repository';
import { RolesRepository } from '../../../../common/database/role/roles.repository';
import { InternalUsersRepository } from '../../../../common/database/internal-user/internal-users.repository';
import { InternalUserConnectionsRepository } from '../../../../common/database/internal-user-connection/internal-user-connections.repository';
import { InternalUsersService } from '../../internal-users.service';

describe('InternalUsersService.findConnections', () => {
  let users: { findById: ReturnType<typeof mockFn> };
  let applications: { findByIds: ReturnType<typeof mockFn> };
  let connections: { findAllByInternalUserId: ReturnType<typeof mockFn> };
  let service: InternalUsersService;

  beforeEach(() => {
    users = { findById: mockFn() };
    applications = { findByIds: mockFn() };
    connections = { findAllByInternalUserId: mockFn() };
    service = new InternalUsersService(
      users as unknown as InternalUsersRepository,
      applications as unknown as ApplicationsRepository,
      {} as unknown as RolesRepository,
      {} as never,
      {} as never,
      connections as unknown as InternalUserConnectionsRepository,
    );
    users.findById.mockResolvedValue({ id: 1 });
  });

  it('throws NotFound when the user does not exist', async () => {
    users.findById.mockResolvedValue(null);

    await expect(service.findConnections(1)).rejects.toThrow(
      new NotFoundException('Internal user not found'),
    );
    expect(connections.findAllByInternalUserId).not.toHaveBeenCalled();
  });

  it('returns the connections with the names of both applications', async () => {
    connections.findAllByInternalUserId.mockResolvedValue([
      {
        id: 1,
        internalUserId: 1,
        originApplicationId: 10,
        destinationApplicationId: 20,
      },
      {
        id: 2,
        internalUserId: 1,
        originApplicationId: 10,
        destinationApplicationId: 30,
      },
    ]);
    applications.findByIds.mockResolvedValue([
      { id: 10, name: 'iam' },
      { id: 20, name: 'hub' },
      { id: 30, name: 'infra' },
    ]);

    await expect(service.findConnections(1)).resolves.toEqual([
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
    ]);
    expect(connections.findAllByInternalUserId).toHaveBeenCalledWith(1);
  });

  it('looks every application up once, even when it appears several times', async () => {
    connections.findAllByInternalUserId.mockResolvedValue([
      {
        id: 1,
        internalUserId: 1,
        originApplicationId: 10,
        destinationApplicationId: 20,
      },
      {
        id: 2,
        internalUserId: 1,
        originApplicationId: 10,
        destinationApplicationId: 30,
      },
    ]);
    applications.findByIds.mockResolvedValue([]);

    await service.findConnections(1);

    expect(applications.findByIds).toHaveBeenCalledWith([10, 20, 30]);
  });

  it('returns an empty list for a user without connections', async () => {
    connections.findAllByInternalUserId.mockResolvedValue([]);
    applications.findByIds.mockResolvedValue([]);

    await expect(service.findConnections(1)).resolves.toEqual([]);
    expect(applications.findByIds).toHaveBeenCalledWith([]);
  });

  it('leaves the application name undefined when the application no longer exists (current behavior)', async () => {
    connections.findAllByInternalUserId.mockResolvedValue([
      {
        id: 1,
        internalUserId: 1,
        originApplicationId: 10,
        destinationApplicationId: 20,
      },
    ]);
    applications.findByIds.mockResolvedValue([{ id: 10, name: 'iam' }]);

    const result = await service.findConnections(1);

    expect(result[0].destinationApplicationName).toBeUndefined();
  });

  it('propagates a repository failure', async () => {
    const failure = new Error('db down');
    connections.findAllByInternalUserId.mockRejectedValue(failure);

    await expect(service.findConnections(1)).rejects.toBe(failure);
  });
});
