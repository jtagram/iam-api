import { beforeEach, describe, expect, it } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { mockFn } from '../../../../../test/helpers/mocks';
import { ApplicationsRepository } from '../../../../common/database/application/applications.repository';
import { RolesRepository } from '../../../../common/database/role/roles.repository';
import { AppUsersRepository } from '../../../../common/database/app-user/app-users.repository';
import { UserAppEntity } from '../../../../common/database/user-application/user-app.entity';
import { UserAppsRepository } from '../../../../common/database/user-application/user-apps.repository';
import { AppUsersService } from '../../apps-users.service';

describe('AppUsersService.assignApplication', () => {
  let users: { findById: ReturnType<typeof mockFn> };
  let applications: { findById: ReturnType<typeof mockFn> };
  let userApps: {
    existsForAppUserAndApplication: ReturnType<typeof mockFn>;
    createAssignment: ReturnType<typeof mockFn>;
  };
  let service: AppUsersService;
  const dto = { applicationId: 5 };

  beforeEach(() => {
    users = { findById: mockFn() };
    applications = { findById: mockFn() };
    userApps = {
      existsForAppUserAndApplication: mockFn(),
      createAssignment: mockFn(),
    };
    service = new AppUsersService(
      users as unknown as AppUsersRepository,
      applications as unknown as ApplicationsRepository,
      {} as unknown as RolesRepository,
      userApps as unknown as UserAppsRepository,
      {} as never,
      {} as never,
    );
    users.findById.mockResolvedValue({ id: 1 });
    applications.findById.mockResolvedValue({ id: 5 });
    userApps.existsForAppUserAndApplication.mockResolvedValue(false);
    userApps.createAssignment.mockImplementation(
      async (entity: UserAppEntity) => Object.assign(entity, { id: 70 }),
    );
  });

  it('throws NotFound when the user does not exist', async () => {
    users.findById.mockResolvedValue(null);

    await expect(service.assignApplication(1, dto)).rejects.toThrow(
      new NotFoundException('Application user not found'),
    );
    expect(users.findById).toHaveBeenCalledWith(1);
  });

  it('does nothing else when the user does not exist', async () => {
    users.findById.mockResolvedValue(null);

    await service.assignApplication(1, dto).catch(() => undefined);

    expect(applications.findById).not.toHaveBeenCalled();
    expect(userApps.createAssignment).not.toHaveBeenCalled();
  });

  it('throws NotFound when the application does not exist', async () => {
    applications.findById.mockResolvedValue(null);

    await expect(service.assignApplication(1, dto)).rejects.toThrow(
      new NotFoundException('Application not found'),
    );
    expect(applications.findById).toHaveBeenCalledWith(5);
    expect(userApps.createAssignment).not.toHaveBeenCalled();
  });

  it('throws Conflict when the application is already assigned', async () => {
    userApps.existsForAppUserAndApplication.mockResolvedValue(true);

    await expect(service.assignApplication(1, dto)).rejects.toThrow(
      new ConflictException('Application already assigned to this user'),
    );
    expect(userApps.existsForAppUserAndApplication).toHaveBeenCalledWith(1, 5);
    expect(userApps.createAssignment).not.toHaveBeenCalled();
  });

  it('persists an assignment for the user and the application', async () => {
    await service.assignApplication(1, dto);

    const entity = userApps.createAssignment.mock.calls[0][0];
    expect(entity).toBeInstanceOf(UserAppEntity);
    expect(entity).toMatchObject({ appUserId: 1, applicationId: 5 });
  });

  it('returns the created assignment', async () => {
    await expect(service.assignApplication(1, dto)).resolves.toEqual({
      msg: 'Application assigned to user successfully',
      data: { id: 70, appUserId: 1, applicationId: 5 },
    });
  });

  it('propagates a repository failure', async () => {
    const failure = new Error('db down');
    userApps.createAssignment.mockRejectedValue(failure);

    await expect(service.assignApplication(1, dto)).rejects.toBe(failure);
  });
});
