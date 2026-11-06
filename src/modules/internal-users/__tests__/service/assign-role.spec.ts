import { beforeEach, describe, expect, it } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { mockFn } from '../../../../../test/helpers/mocks';
import { ApplicationsRepository } from '../../../../common/database/application/applications.repository';
import { RolesRepository } from '../../../../common/database/role/roles.repository';
import { InternalUsersRepository } from '../../../../common/database/internal-user/internal-users.repository';
import { InternalUserRoleEntity } from '../../../../common/database/internal-user/internal-user-role.entity';
import { InternalUsersService } from '../../internal-users.service';

describe('InternalUsersService.assignRole', () => {
	let users: {
		findById: ReturnType<typeof mockFn>;
		findByIdWithAssignments: ReturnType<typeof mockFn>;
		findApplicationAssignment: ReturnType<typeof mockFn>;
		hasRole: ReturnType<typeof mockFn>;
		addRole: ReturnType<typeof mockFn>;
	};
	let roles: { findById: ReturnType<typeof mockFn> };
	let service: InternalUsersService;
	const tree = { id: 1, applications: [{ id: 70, applicationId: 5 }] };
	const dto = { roleId: 9 };

	beforeEach(() => {
		users = {
			findById: mockFn(),
			findByIdWithAssignments: mockFn(),
			findApplicationAssignment: mockFn(),
			hasRole: mockFn(),
			addRole: mockFn(),
		};
		roles = { findById: mockFn() };
		service = new InternalUsersService(
			users as unknown as InternalUsersRepository,
			{} as unknown as ApplicationsRepository,
			roles as unknown as RolesRepository,
		);
		users.findById.mockResolvedValue({ id: 1 });
		users.findByIdWithAssignments.mockResolvedValue(tree);
		roles.findById.mockResolvedValue({ id: 9, applicationId: 5 });
		users.findApplicationAssignment.mockResolvedValue({
			id: 30,
			internalUserId: 1,
			applicationId: 5,
		});
		users.hasRole.mockResolvedValue(false);
		users.addRole.mockImplementation((entity: InternalUserRoleEntity) =>
			Promise.resolve(Object.assign(entity, { id: 80 })),
		);
	});

	it('throws NotFound when the user does not exist', async () => {
		users.findById.mockResolvedValue(null);

		await expect(service.assignRole(1, dto)).rejects.toThrow(
			new NotFoundException('Internal user not found'),
		);
		expect(roles.findById).not.toHaveBeenCalled();
	});

	it('throws NotFound when the role does not exist', async () => {
		roles.findById.mockResolvedValue(null);

		await expect(service.assignRole(1, dto)).rejects.toThrow(
			new NotFoundException('Role not found'),
		);
		expect(roles.findById).toHaveBeenCalledWith(9);
		expect(users.addRole).not.toHaveBeenCalled();
	});

	it('throws Conflict when the user already has the role', async () => {
		users.hasRole.mockResolvedValue(true);

		await expect(service.assignRole(1, dto)).rejects.toThrow(
			new ConflictException('Role already assigned to this user'),
		);
		expect(users.hasRole).toHaveBeenCalledWith(1, 9);
		expect(users.addRole).not.toHaveBeenCalled();
	});

	it('throws Conflict when the role application is not assigned to the user', async () => {
		users.findApplicationAssignment.mockResolvedValue(null);

		await expect(service.assignRole(1, dto)).rejects.toThrow(
			new ConflictException('Application is not assigned to the user'),
		);
		expect(users.findApplicationAssignment).toHaveBeenCalledWith(1, 5);
		expect(users.addRole).not.toHaveBeenCalled();
	});

	it('hangs the role off the assignment of the role application, never off a caller value', async () => {
		await service.assignRole(1, { roleId: 9, applicationId: 777 } as never);

		const entity = users.addRole.mock.calls[0][0] as InternalUserRoleEntity;
		expect(entity).toBeInstanceOf(InternalUserRoleEntity);
		expect(entity).toMatchObject({ internalUserApplicationId: 30, roleId: 9 });
		expect(users.findApplicationAssignment).toHaveBeenCalledWith(1, 5);
	});

	it('reloads the user with its assignments after creating and returns that tree', async () => {
		await expect(service.assignRole(1, dto)).resolves.toEqual({
			ok: true,
			msg: 'Role assigned to internal user successfully',
			data: tree,
		});

		expect(users.findByIdWithAssignments).toHaveBeenCalledWith(1);
		expect(users.findByIdWithAssignments).toHaveBeenCalledTimes(1);
		expect(users.addRole.mock.invocationCallOrder[0]).toBeLessThan(
			users.findByIdWithAssignments.mock.invocationCallOrder[0],
		);
	});

	it('throws NotFound when the reload returns null', async () => {
		users.findByIdWithAssignments.mockResolvedValue(null);

		await expect(service.assignRole(1, dto)).rejects.toThrow(
			new NotFoundException('Internal user not found'),
		);
	});

	it('propagates a repository failure', async () => {
		const failure = new Error('db down');
		users.addRole.mockRejectedValue(failure);

		await expect(service.assignRole(1, dto)).rejects.toBe(failure);
	});
});
