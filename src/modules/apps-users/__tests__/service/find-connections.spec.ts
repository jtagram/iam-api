import { beforeEach, describe, expect, it } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { mockFn } from '../../../../../test/helpers/mocks';
import { AppUsersRepository } from '../../../../common/database/app-user/app-users.repository';
import { AppUsersService } from '../../apps-users.service';

describe('AppUsersService.findConnections', () => {
	let users: { findByIdWithConnections: ReturnType<typeof mockFn> };
	let applications: { findByIds: ReturnType<typeof mockFn> };
	let service: AppUsersService;

	beforeEach(() => {
		users = { findByIdWithConnections: mockFn() };
		applications = { findByIds: mockFn() };
		service = new AppUsersService(
			users as unknown as AppUsersRepository,
			applications as never,
			{} as never,
		);
	});

	const userWithConnections = {
		id: 1,
		connections: [
			{
				id: 2,
				originApplicationId: 10,
				destinationApplicationId: 30,
				originApplication: { id: 10, name: 'iam' },
				destinationApplication: { id: 30, name: 'infra' },
			},
			{
				id: 1,
				originApplicationId: 10,
				destinationApplicationId: 20,
				originApplication: { id: 10, name: 'iam' },
				destinationApplication: { id: 20, name: 'hub' },
			},
		],
	};

	it('throws NotFound when the user does not exist', async () => {
		users.findByIdWithConnections.mockResolvedValue(null);

		await expect(service.findConnections(1)).rejects.toThrow(
			new NotFoundException('Application user not found'),
		);
	});

	it('returns the user with its connections as loaded by the repository', async () => {
		users.findByIdWithConnections.mockResolvedValue(userWithConnections);

		const response = await service.findConnections(1);

		expect(response).toEqual({
			ok: true,
			msg: 'Connections retrieved successfully',
			data: userWithConnections,
		});
		expect(response.data).toBe(userWithConnections);
		expect(users.findByIdWithConnections).toHaveBeenCalledWith(1);
	});

	it('does not look the applications up again', async () => {
		users.findByIdWithConnections.mockResolvedValue(userWithConnections);

		await service.findConnections(1);

		expect(applications.findByIds).not.toHaveBeenCalled();
	});

	it('returns an empty connection list for a user without connections', async () => {
		users.findByIdWithConnections.mockResolvedValue({ id: 1, connections: [] });

		await expect(service.findConnections(1)).resolves.toEqual({
			ok: true,
			msg: 'Connections retrieved successfully',
			data: { id: 1, connections: [] },
		});
	});

	it('propagates a repository failure', async () => {
		const failure = new Error('db down');
		users.findByIdWithConnections.mockRejectedValue(failure);

		await expect(service.findConnections(1)).rejects.toBe(failure);
	});
});
