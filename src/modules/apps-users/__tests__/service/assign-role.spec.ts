import { beforeEach, describe, expect, it } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { mockFn } from '../../../../../test/helpers/mocks';
import { ApplicationsRepository } from '../../../../common/database/application/applications.repository';
import { RolesRepository } from '../../../../common/database/role/roles.repository';
import { AppUsersRepository } from '../../../../common/database/app-user/app-users.repository';
import { UserRoleEntity } from '../../../../common/database/user-role/user-role.entity';
import { UserRolesRepository } from '../../../../common/database/user-role/user-roles.repository';
import { AppUsersService } from '../../apps-users.service';

describe('AppUsersService.assignRole', () => {
  let users: { findById: ReturnType<typeof mockFn> };
  let roles: { findById: ReturnType<typeof mockFn> };
  let userRoles: {
    existsForAppUserAndRole: ReturnType<typeof mockFn>;
    createAssignment: ReturnType<typeof mockFn>;
  };
  let service: AppUsersService;
  const dto = { roleId: 9 };

  beforeEach(() => {
    users = { findById: mockFn() };
    roles = { findById: mockFn() };
    userRoles = {
      existsForAppUserAndRole: mockFn(),
      createAssignment: mockFn(),
    };
    service = new AppUsersService(
      users as unknown as AppUsersRepository,
      {} as unknown as ApplicationsRepository,
      roles as unknown as RolesRepository,
      {} as never,
      userRoles as unknown as UserRolesRepository,
      {} as never,
    );
    users.findById.mockResolvedValue({ id: 1 });
    roles.findById.mockResolvedValue({ id: 9, applicationId: 5 });
    userRoles.existsForAppUserAndRole.mockResolvedValue(false);
    userRoles.createAssignment.mockImplementation(
      async (entity: UserRoleEntity) => Object.assign(entity, { id: 80 }),
    );
  });

  it('throws NotFound when the user does not exist', async () => {
    users.findById.mockResolvedValue(null);

    await expect(service.assignRole(1, dto)).rejects.toThrow(
      new NotFoundException('Application user not found'),
    );
    expect(roles.findById).not.toHaveBeenCalled();
  });

  it('throws NotFound when the role does not exist', async () => {
    roles.findById.mockResolvedValue(null);

    await expect(service.assignRole(1, dto)).rejects.toThrow(
      new NotFoundException('Role not found'),
    );
    expect(roles.findById).toHaveBeenCalledWith(9);
    expect(userRoles.createAssignment).not.toHaveBeenCalled();
  });

  it('throws Conflict when the user already has the role', async () => {
    userRoles.existsForAppUserAndRole.mockResolvedValue(true);

    await expect(service.assignRole(1, dto)).rejects.toThrow(
      new ConflictException('Role already assigned to this user'),
    );
    expect(userRoles.existsForAppUserAndRole).toHaveBeenCalledWith(1, 9);
    expect(userRoles.createAssignment).not.toHaveBeenCalled();
  });

  it('copies the applicationId from the role, never from the caller', async () => {
    await service.assignRole(1, { roleId: 9, applicationId: 777 } as never);

    const entity = userRoles.createAssignment.mock.calls[0][0];
    expect(entity).toBeInstanceOf(UserRoleEntity);
    expect(entity).toMatchObject({
      appUserId: 1,
      roleId: 9,
      applicationId: 5,
    });
  });

  it('does not require the application to be assigned to the user first (current behavior)', async () => {
    await expect(service.assignRole(1, dto)).resolves.toBeDefined();
  });

  it('returns the created assignment', async () => {
    await expect(service.assignRole(1, dto)).resolves.toEqual({
      msg: 'Role assigned to user successfully',
      data: { id: 80, appUserId: 1, roleId: 9, applicationId: 5 },
    });
  });

  it('propagates a repository failure', async () => {
    const failure = new Error('db down');
    userRoles.createAssignment.mockRejectedValue(failure);

    await expect(service.assignRole(1, dto)).rejects.toBe(failure);
  });
});
