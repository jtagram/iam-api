import { beforeEach, describe, expect, it } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { mockFn } from '../../../../../test/helpers/mocks';
import { ApplicationsRepository } from '../../../../common/database/application/applications.repository';
import { RolesRepository } from '../../../../common/database/role/roles.repository';
import { AppUsersRepository } from '../../../../common/database/app-user/app-users.repository';
import { UserAppsRepository } from '../../../../common/database/user-application/user-apps.repository';
import { UserRolesRepository } from '../../../../common/database/user-role/user-roles.repository';
import { AppUsersService } from '../../apps-users.service';

const dataOf = (result: unknown) =>
  (result as { data: Array<{ roles: unknown[] }> }).data;

describe('AppUsersService.findAssignedApplications', () => {
  let users: { findById: ReturnType<typeof mockFn> };
  let applications: { findByIds: ReturnType<typeof mockFn> };
  let roles: { findByIds: ReturnType<typeof mockFn> };
  let userApps: { findAllByAppUserId: ReturnType<typeof mockFn> };
  let userRoles: { findAllByAppUserId: ReturnType<typeof mockFn> };
  let service: AppUsersService;

  beforeEach(() => {
    users = { findById: mockFn() };
    applications = { findByIds: mockFn() };
    roles = { findByIds: mockFn() };
    userApps = { findAllByAppUserId: mockFn() };
    userRoles = { findAllByAppUserId: mockFn() };
    service = new AppUsersService(
      users as unknown as AppUsersRepository,
      applications as unknown as ApplicationsRepository,
      roles as unknown as RolesRepository,
      userApps as unknown as UserAppsRepository,
      userRoles as unknown as UserRolesRepository,
      {} as never,
    );
    users.findById.mockResolvedValue({ id: 1 });
    userApps.findAllByAppUserId.mockResolvedValue([]);
    userRoles.findAllByAppUserId.mockResolvedValue([]);
    applications.findByIds.mockResolvedValue([]);
    roles.findByIds.mockResolvedValue([]);
  });

  it('throws NotFound when the user does not exist', async () => {
    users.findById.mockResolvedValue(null);

    await expect(service.findAssignedApplications(1)).rejects.toThrow(
      new NotFoundException('Application user not found'),
    );
    expect(userApps.findAllByAppUserId).not.toHaveBeenCalled();
  });

  it('returns an empty list for a user without applications nor roles', async () => {
    await expect(service.findAssignedApplications(1)).resolves.toEqual({
      msg: 'Assigned applications retrieved successfully',
      data: [],
    });
    expect(applications.findByIds).toHaveBeenCalledWith([]);
    expect(roles.findByIds).toHaveBeenCalledWith([]);
  });

  it('returns an assigned application with no roles when none were assigned', async () => {
    userApps.findAllByAppUserId.mockResolvedValue([{ applicationId: 10 }]);
    applications.findByIds.mockResolvedValue([
      { id: 10, name: 'iam', description: 'Identity' },
    ]);

    await expect(service.findAssignedApplications(1)).resolves.toEqual({
      msg: 'Assigned applications retrieved successfully',
      data: [
        {
          applicationId: 10,
          applicationName: 'iam',
          applicationDescription: 'Identity',
          roles: [],
        },
      ],
    });
  });

  it('groups each role under the application it belongs to', async () => {
    userApps.findAllByAppUserId.mockResolvedValue([
      { applicationId: 10 },
      { applicationId: 20 },
    ]);
    userRoles.findAllByAppUserId.mockResolvedValue([
      { applicationId: 10, roleId: 100 },
      { applicationId: 20, roleId: 200 },
    ]);
    applications.findByIds.mockResolvedValue([
      { id: 10, name: 'iam', description: 'Identity' },
      { id: 20, name: 'hub', description: 'Tickets' },
    ]);
    roles.findByIds.mockResolvedValue([
      { id: 100, applicationId: 10, name: 'ADMIN', description: 'Admin' },
      { id: 200, applicationId: 20, name: 'VIEWER', description: 'Viewer' },
    ]);

    const result = await service.findAssignedApplications(1);

    expect(dataOf(result).map((entry) => entry.roles)).toEqual([
      [{ id: 100, name: 'ADMIN', description: 'Admin' }],
      [{ id: 200, name: 'VIEWER', description: 'Viewer' }],
    ]);
  });

  it('includes an application that only came from a role assignment', async () => {
    userRoles.findAllByAppUserId.mockResolvedValue([
      { applicationId: 20, roleId: 200 },
    ]);
    applications.findByIds.mockResolvedValue([
      { id: 20, name: 'hub', description: 'Tickets' },
    ]);
    roles.findByIds.mockResolvedValue([
      { id: 200, applicationId: 20, name: 'VIEWER', description: 'Viewer' },
    ]);

    await service.findAssignedApplications(1);

    expect(applications.findByIds).toHaveBeenCalledWith([20]);
  });

  it('looks each application up once when it came from both assignments', async () => {
    userApps.findAllByAppUserId.mockResolvedValue([{ applicationId: 10 }]);
    userRoles.findAllByAppUserId.mockResolvedValue([
      { applicationId: 10, roleId: 100 },
      { applicationId: 10, roleId: 101 },
    ]);

    await service.findAssignedApplications(1);

    expect(applications.findByIds).toHaveBeenCalledWith([10]);
  });

  it('loads the roles by the ids of the role assignments', async () => {
    userRoles.findAllByAppUserId.mockResolvedValue([
      { applicationId: 10, roleId: 100 },
      { applicationId: 20, roleId: 200 },
    ]);

    await service.findAssignedApplications(1);

    expect(roles.findByIds).toHaveBeenCalledWith([100, 200]);
  });

  it('propagates a repository failure', async () => {
    const failure = new Error('db down');
    userApps.findAllByAppUserId.mockRejectedValue(failure);

    await expect(service.findAssignedApplications(1)).rejects.toBe(failure);
  });
});
