import { beforeEach, describe, expect, it } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { mockFn } from '../../../../../test/helpers/mocks';
import { ApplicationsRepository } from '../../../../common/database/application/applications.repository';
import { RolesRepository } from '../../../../common/database/role/roles.repository';
import { InternalUsersRepository } from '../../../../common/database/internal-user/internal-users.repository';
import { InternalUserAppEntity } from '../../../../common/database/internal-user/internal-user-app.entity';
import { InternalUsersService } from '../../internal-users.service';

describe('InternalUsersService.assignApplication', () => {
	let users: {
		findById: ReturnType<typeof mockFn>;
		findByIdWithAssignments: ReturnType<typeof mockFn>;
		hasApplication: ReturnType<typeof mockFn>;
		addApplication: ReturnType<typeof mockFn>;
	};
	let applications: { findById: ReturnType<typeof mockFn> };
	let service: InternalUsersService;
	const tree = { id: 1, applications: [{ id: 70, applicationId: 5 }] };
	const dto = { applicationId: 5 };

	beforeEach(() => {
		users = {
			findById: mockFn(),
			findByIdWithAssignments: mockFn(),
			hasApplication: mockFn(),
			addApplication: mockFn(),
		};
		applications = { findById: mockFn() };
		service = new InternalUsersService(
			users as unknown as InternalUsersRepository,
			applications as unknown as ApplicationsRepository,
			{} as unknown as RolesRepository,
		);
		users.findById.mockResolvedValue({ id: 1 });
		users.findByIdWithAssignments.mockResolvedValue(tree);
		applications.findById.mockResolvedValue({ id: 5 });
		users.hasApplication.mockResolvedValue(false);
		users.addApplication.mockImplementation((entity: InternalUserAppEntity) =>
			Promise.resolve(Object.assign(entity, { id: 70 })),
		);
	});

	it('throws NotFound when the user does not exist', async () => {
		users.findById.mockResolvedValue(null);

		await expect(service.assignApplication(1, dto)).rejects.toThrow(
			new NotFoundException('Internal user not found'),
		);
		expect(users.findById).toHaveBeenCalledWith(1);
	});

	it('does nothing else when the user does not exist', async () => {
		users.findById.mockResolvedValue(null);

		await service.assignApplication(1, dto).catch(() => undefined);

		expect(applications.findById).not.toHaveBeenCalled();
		expect(users.addApplication).not.toHaveBeenCalled();
	});

	it('throws NotFound when the application does not exist', async () => {
		applications.findById.mockResolvedValue(null);

		await expect(service.assignApplication(1, dto)).rejects.toThrow(
			new NotFoundException('Application not found'),
		);
		expect(applications.findById).toHaveBeenCalledWith(5);
		expect(users.addApplication).not.toHaveBeenCalled();
	});

	it('throws Conflict when the application is already assigned', async () => {
		users.hasApplication.mockResolvedValue(true);

		await expect(service.assignApplication(1, dto)).rejects.toThrow(
			new ConflictException('Application already assigned to this user'),
		);
		expect(users.hasApplication).toHaveBeenCalledWith(1, 5);
		expect(users.addApplication).not.toHaveBeenCalled();
	});

	it('persists an assignment for the user and the application', async () => {
		await service.assignApplication(1, dto);

		const entity = users.addApplication.mock.calls[0][0] as InternalUserAppEntity;
		expect(entity).toBeInstanceOf(InternalUserAppEntity);
		expect(entity).toMatchObject({ internalUserId: 1, applicationId: 5 });
	});

	it('reloads the user with its assignments after creating and returns that tree', async () => {
		await expect(service.assignApplication(1, dto)).resolves.toEqual({
			ok: true,
			msg: 'Application assigned to internal user successfully',
			data: tree,
		});

		expect(users.findByIdWithAssignments).toHaveBeenCalledWith(1);
		expect(users.findByIdWithAssignments).toHaveBeenCalledTimes(1);
		expect(users.addApplication.mock.invocationCallOrder[0]).toBeLessThan(
			users.findByIdWithAssignments.mock.invocationCallOrder[0],
		);
	});

	it('throws NotFound when the reload returns null', async () => {
		users.findByIdWithAssignments.mockResolvedValue(null);

		await expect(service.assignApplication(1, dto)).rejects.toThrow(
			new NotFoundException('Internal user not found'),
		);
	});

	it('propagates a repository failure', async () => {
		const failure = new Error('db down');
		users.addApplication.mockRejectedValue(failure);

		await expect(service.assignApplication(1, dto)).rejects.toBe(failure);
	});
});
