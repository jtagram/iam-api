import { beforeEach, describe, expect, it } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import {
	applicationAssignment,
	applicationRow,
	roleRow,
} from '../../../../../test/helpers/assignment-rows';
import { mockFn } from '../../../../../test/helpers/mocks';
import { AppUsersRepository } from '../../../../common/database/app-user/app-users.repository';
import { AppUsersService } from '../../apps-users.service';

const applicationsOf = (result: { data?: unknown }) =>
	(
		result.data as {
			applications: Array<{
				applicationId: number;
				application: { id: number };
				roles: Array<{ role: { name: string } }>;
			}>;
		}
	).applications;

describe('AppUsersService.findAssignedApplications', () => {
	let users: { findByIdWithAssignments: ReturnType<typeof mockFn> };
	let service: AppUsersService;

	const iam = applicationRow(10, 'iam', 'Identity');
	const hub = applicationRow(20, 'hub', 'Tickets');
	const admin = roleRow(100, 10, 'ADMIN', 'Admin');
	const viewer = roleRow(200, 20, 'VIEWER', 'Viewer');

	beforeEach(() => {
		users = { findByIdWithAssignments: mockFn() };
		service = new AppUsersService(users as unknown as AppUsersRepository, {} as never, {} as never);
		users.findByIdWithAssignments.mockResolvedValue({ id: 1, applications: [] });
	});

	it('throws NotFound when the user does not exist', async () => {
		users.findByIdWithAssignments.mockResolvedValue(null);

		await expect(service.findAssignedApplications(1)).rejects.toThrow(
			new NotFoundException('Application user not found'),
		);
	});

	it('loads the user with its assignments in a single repository call', async () => {
		await service.findAssignedApplications(1);

		expect(users.findByIdWithAssignments).toHaveBeenCalledTimes(1);
		expect(users.findByIdWithAssignments).toHaveBeenCalledWith(1);
	});

	it('returns the user itself with an empty applications list when nothing is assigned', async () => {
		const user = { id: 1, applications: [] };
		users.findByIdWithAssignments.mockResolvedValue(user);

		const result = await service.findAssignedApplications(1);

		expect(result).toEqual({
			ok: true,
			msg: 'Assigned applications retrieved successfully',
			data: user,
		});
		expect(result.data).toBe(user);
	});

	it('returns the assignment rows as the repository loaded them, application included', async () => {
		const row = applicationAssignment(iam);
		const user = { id: 1, applications: [row] };
		users.findByIdWithAssignments.mockResolvedValue(user);

		const result = await service.findAssignedApplications(1);

		expect(result).toMatchObject({
			ok: true,
			msg: 'Assigned applications retrieved successfully',
		});
		expect(result.data).toBe(user);
		expect(result.data?.applications[0]).toBe(row);
		expect(result.data?.applications[0]).toMatchObject({
			application: { id: 10, name: 'iam' },
			roles: [],
		});
	});

	it('keeps each role nested under the application assignment it hangs off', async () => {
		users.findByIdWithAssignments.mockResolvedValue({
			id: 1,
			applications: [applicationAssignment(hub, [viewer]), applicationAssignment(iam, [admin])],
		});

		const result = await service.findAssignedApplications(1);

		expect(
			applicationsOf(result).map((entry) => [
				entry.application.id,
				entry.roles.map((r) => r.role.name),
			]),
		).toEqual([
			[20, ['VIEWER']],
			[10, ['ADMIN']],
		]);
	});

	it('keeps the order the repository returns (newest first)', async () => {
		users.findByIdWithAssignments.mockResolvedValue({
			id: 1,
			applications: [applicationAssignment(hub), applicationAssignment(iam)],
		});

		const result = await service.findAssignedApplications(1);

		expect(applicationsOf(result).map((entry) => entry.applicationId)).toEqual([20, 10]);
	});

	it('propagates a repository failure', async () => {
		const failure = new Error('db down');
		users.findByIdWithAssignments.mockRejectedValue(failure);

		await expect(service.findAssignedApplications(1)).rejects.toBe(failure);
	});
});
