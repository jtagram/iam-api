import { beforeEach, describe, expect, it } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { mockFn } from '../../../../../test/helpers/mocks';
import { ApplicationsRepository } from '../../../../common/database/application/applications.repository';
import { RolesRepository } from '../../../../common/database/role/roles.repository';
import { AppUsersRepository } from '../../../../common/database/app-user/app-users.repository';
import { UserAppsRepository } from '../../../../common/database/user-application/user-apps.repository';
import { AppUserConnectionEntity } from '../../../../common/database/app-user-connection/app-user-connection.entity';
import { AppUserConnectionsRepository } from '../../../../common/database/app-user-connection/app-user-connections.repository';
import { AppUsersService } from '../../apps-users.service';

describe('AppUsersService.createConnection', () => {
  let users: { findById: ReturnType<typeof mockFn> };
  let applications: { findByIds: ReturnType<typeof mockFn> };
  let userApps: { existsForAppUserAndApplication: ReturnType<typeof mockFn> };
  let connections: {
    existsForAppUserAndApplications: ReturnType<typeof mockFn>;
    createConnection: ReturnType<typeof mockFn>;
  };
  let service: AppUsersService;
  const dto = { originApplicationId: 10, destinationApplicationId: 20 };

  beforeEach(() => {
    users = { findById: mockFn() };
    applications = { findByIds: mockFn() };
    userApps = { existsForAppUserAndApplication: mockFn() };
    connections = {
      existsForAppUserAndApplications: mockFn(),
      createConnection: mockFn(),
    };
    service = new AppUsersService(
      users as unknown as AppUsersRepository,
      applications as unknown as ApplicationsRepository,
      {} as unknown as RolesRepository,
      userApps as unknown as UserAppsRepository,
      {} as never,
      connections as unknown as AppUserConnectionsRepository,
    );
    users.findById.mockResolvedValue({ id: 1 });
    applications.findByIds.mockResolvedValue([
      { id: 10, name: 'iam' },
      { id: 20, name: 'hub' },
    ]);
    userApps.existsForAppUserAndApplication.mockResolvedValue(true);
    connections.existsForAppUserAndApplications.mockResolvedValue(false);
    connections.createConnection.mockImplementation(
      async (entity: AppUserConnectionEntity) =>
        Object.assign(entity, { id: 90 }),
    );
  });

  it('throws NotFound when the user does not exist', async () => {
    users.findById.mockResolvedValue(null);

    await expect(service.createConnection(1, dto)).rejects.toThrow(
      new NotFoundException('Application user not found'),
    );
    expect(applications.findByIds).not.toHaveBeenCalled();
  });

  it('throws BadRequest when origin and destination are the same application', async () => {
    await expect(
      service.createConnection(1, {
        originApplicationId: 10,
        destinationApplicationId: 10,
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'Origin and destination applications must be different',
      ),
    );
    expect(applications.findByIds).not.toHaveBeenCalled();
  });

  it('looks up the origin and the destination applications', async () => {
    await service.createConnection(1, dto);

    expect(applications.findByIds).toHaveBeenNthCalledWith(1, [10, 20]);
  });

  it('throws NotFound when one of the applications does not exist', async () => {
    applications.findByIds.mockResolvedValue([{ id: 10, name: 'iam' }]);

    await expect(service.createConnection(1, dto)).rejects.toThrow(
      new NotFoundException('Application not found'),
    );
    expect(connections.createConnection).not.toHaveBeenCalled();
  });

  it('throws BadRequest when the origin is not assigned to the user', async () => {
    userApps.existsForAppUserAndApplication.mockResolvedValueOnce(false);

    await expect(service.createConnection(1, dto)).rejects.toThrow(
      new BadRequestException(
        'The user does not have this application assigned',
      ),
    );
    expect(userApps.existsForAppUserAndApplication).toHaveBeenCalledWith(1, 10);
    expect(connections.createConnection).not.toHaveBeenCalled();
  });

  it('throws BadRequest when the destination is not assigned to the user', async () => {
    userApps.existsForAppUserAndApplication
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    await expect(service.createConnection(1, dto)).rejects.toThrow(
      'The user does not have this application assigned',
    );
    expect(userApps.existsForAppUserAndApplication).toHaveBeenNthCalledWith(
      2,
      1,
      20,
    );
    expect(connections.createConnection).not.toHaveBeenCalled();
  });

  it('throws Conflict when the connection already exists', async () => {
    connections.existsForAppUserAndApplications.mockResolvedValue(true);

    await expect(service.createConnection(1, dto)).rejects.toThrow(
      new ConflictException('This connection already exists for the user'),
    );
    expect(connections.existsForAppUserAndApplications).toHaveBeenCalledWith(
      1,
      10,
      20,
    );
    expect(connections.createConnection).not.toHaveBeenCalled();
  });

  it('persists a connection for the user, origin and destination', async () => {
    await service.createConnection(1, dto);

    const entity = connections.createConnection.mock.calls[0][0];
    expect(entity).toBeInstanceOf(AppUserConnectionEntity);
    expect(entity).toMatchObject({
      appUserId: 1,
      originApplicationId: 10,
      destinationApplicationId: 20,
    });
  });

  it('returns the created connection with the application names', async () => {
    await expect(service.createConnection(1, dto)).resolves.toEqual({
      msg: 'Connection created successfully',
      data: {
        id: 90,
        originApplicationId: 10,
        originApplicationName: 'iam',
        destinationApplicationId: 20,
        destinationApplicationName: 'hub',
      },
    });
  });

  it('allows the reverse direction as a separate connection', async () => {
    connections.existsForAppUserAndApplications.mockImplementation(
      async (_user: number, origin: number) => origin === 10,
    );
    applications.findByIds.mockResolvedValue([
      { id: 10, name: 'iam' },
      { id: 20, name: 'hub' },
    ]);

    await expect(
      service.createConnection(1, {
        originApplicationId: 20,
        destinationApplicationId: 10,
      }),
    ).resolves.toBeDefined();
  });

  it('propagates a repository failure', async () => {
    const failure = new Error('db down');
    connections.createConnection.mockRejectedValue(failure);

    await expect(service.createConnection(1, dto)).rejects.toBe(failure);
  });
});
