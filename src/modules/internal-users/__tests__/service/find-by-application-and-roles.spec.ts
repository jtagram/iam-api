import { beforeEach, describe, expect, it } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { mockFn } from '../../../../../test/helpers/mocks';
import { ApplicationsRepository } from '../../../../common/database/application/applications.repository';
import { InternalUserRolesRepository } from '../../../../common/database/internal-user/internal-user-roles.repository';
import { InternalUsersRepository } from '../../../../common/database/internal-user/internal-users.repository';
import { RolesRepository } from '../../../../common/database/role/roles.repository';
import { InternalUsersService } from '../../internal-users.service';

describe('InternalUsersService.findByApplicationAndRoles', () => {
  let users: { findByIds: ReturnType<typeof mockFn> };
  let applications: { findByName: ReturnType<typeof mockFn> };
  let roles: { findAllByApplicationIdAndNames: ReturnType<typeof mockFn> };
  let userRoles: { findInternalUserIdsByRoleIds: ReturnType<typeof mockFn> };
  let service: InternalUsersService;

  beforeEach(() => {
    users = { findByIds: mockFn() };
    applications = { findByName: mockFn() };
    roles = { findAllByApplicationIdAndNames: mockFn() };
    userRoles = { findInternalUserIdsByRoleIds: mockFn() };
    service = new InternalUsersService(
      users as unknown as InternalUsersRepository,
      applications as unknown as ApplicationsRepository,
      roles as unknown as RolesRepository,
      {} as never,
      userRoles as unknown as InternalUserRolesRepository,
      {} as never,
    );
    applications.findByName.mockResolvedValue({ id: 10, name: 'ticket-hub' });
    roles.findAllByApplicationIdAndNames.mockResolvedValue([]);
    userRoles.findInternalUserIdsByRoleIds.mockResolvedValue([]);
    users.findByIds.mockResolvedValue([]);
  });

  it('throws NotFound when the application name does not exist', async () => {
    applications.findByName.mockResolvedValue(null);

    await expect(
      service.findByApplicationAndRoles({
        applicationName: 'ghost',
        roles: 'ADMIN',
      }),
    ).rejects.toThrow(new NotFoundException('Application not found'));
    expect(applications.findByName).toHaveBeenCalledWith('ghost');
    expect(roles.findAllByApplicationIdAndNames).not.toHaveBeenCalled();
  });

  it('splits the comma-separated role names', async () => {
    await service.findByApplicationAndRoles({
      applicationName: 'ticket-hub',
      roles: 'ADMIN,APPROVER',
    });

    expect(roles.findAllByApplicationIdAndNames).toHaveBeenCalledWith(10, [
      'ADMIN',
      'APPROVER',
    ]);
  });

  it('trims spaces around the role names', async () => {
    await service.findByApplicationAndRoles({
      applicationName: 'ticket-hub',
      roles: ' ADMIN , APPROVER ',
    });

    expect(roles.findAllByApplicationIdAndNames).toHaveBeenCalledWith(10, [
      'ADMIN',
      'APPROVER',
    ]);
  });

  it('drops empty entries produced by stray commas', async () => {
    await service.findByApplicationAndRoles({
      applicationName: 'ticket-hub',
      roles: ',ADMIN,, ,',
    });

    expect(roles.findAllByApplicationIdAndNames).toHaveBeenCalledWith(10, [
      'ADMIN',
    ]);
  });

  it('looks the users up by the ids of the matching roles', async () => {
    roles.findAllByApplicationIdAndNames.mockResolvedValue([
      { id: 100 },
      { id: 101 },
    ]);

    await service.findByApplicationAndRoles({
      applicationName: 'ticket-hub',
      roles: 'ADMIN,APPROVER',
    });

    expect(userRoles.findInternalUserIdsByRoleIds).toHaveBeenCalledWith([
      100, 101,
    ]);
  });

  it('returns the matching users without their password', async () => {
    userRoles.findInternalUserIdsByRoleIds.mockResolvedValue([1, 2]);
    users.findByIds.mockResolvedValue([
      {
        id: 1,
        name: 'Ada',
        lastname: 'L',
        email: 'a@example.com',
        password: 'HASH',
      },
      {
        id: 2,
        name: 'Bob',
        lastname: 'M',
        email: 'b@example.com',
        password: 'HASH',
      },
    ]);

    const result = await service.findByApplicationAndRoles({
      applicationName: 'ticket-hub',
      roles: 'ADMIN',
    });

    expect(users.findByIds).toHaveBeenCalledWith([1, 2]);
    expect(result).toEqual([
      { id: 1, name: 'Ada', lastname: 'L', email: 'a@example.com' },
      { id: 2, name: 'Bob', lastname: 'M', email: 'b@example.com' },
    ]);
  });

  it('returns an empty list when no role matches', async () => {
    await expect(
      service.findByApplicationAndRoles({
        applicationName: 'ticket-hub',
        roles: 'GHOST',
      }),
    ).resolves.toEqual([]);
  });

  it('propagates a repository failure', async () => {
    const failure = new Error('db down');
    users.findByIds.mockRejectedValue(failure);

    await expect(
      service.findByApplicationAndRoles({
        applicationName: 'ticket-hub',
        roles: 'ADMIN',
      }),
    ).rejects.toBe(failure);
  });
});
