import { beforeEach, describe, expect, it } from '@jest/globals';
import {
	applicationAssignment,
	applicationRow,
	roleRow,
} from '../../../../../test/helpers/assignment-rows';
import { mockFn } from '../../../../../test/helpers/mocks';
import { InternalUsersRepository } from '../../../../common/database/internal-user/internal-users.repository';
import { InternalUsersService } from '../../internal-users.service';

describe('InternalUsersService.findAllWithApplications', () => {
	let users: { findAllWithApplicationsOrderedByCreatedAtDesc: ReturnType<typeof mockFn> };
	let service: InternalUsersService;

	const iam = applicationRow(10, 'iam', 'Identity');
	const hub = applicationRow(20, 'hub', 'Tickets');
	const admin = roleRow(100, 10, 'ADMIN', 'Admin');
	const editor = roleRow(101, 10, 'EDITOR', 'Editor');
	const viewer = roleRow(200, 20, 'VIEWER', 'Viewer');

	beforeEach(() => {
		users = { findAllWithApplicationsOrderedByCreatedAtDesc: mockFn() };
		service = new InternalUsersService(
			users as unknown as InternalUsersRepository,
			{} as never,
			{} as never,
		);
		users.findAllWithApplicationsOrderedByCreatedAtDesc.mockResolvedValue([]);
	});

	const user = (id: number, assignments: { applications?: unknown[] } = {}) => ({
		id,
		name: `Name${id}`,
		lastname: `Last${id}`,
		email: `u${id}@example.com`,
		password: 'hash',
		applications: assignments.applications ?? [],
	});

	it('returns an empty list when there are no internal users', async () => {
		await expect(service.findAllWithApplications()).resolves.toEqual({
			ok: true,
			msg: 'Internal users with applications retrieved successfully',
			data: [],
		});
	});

	it('returns the users as the repository loaded them, with an empty applications list', async () => {
		const loaded = user(1);
		users.findAllWithApplicationsOrderedByCreatedAtDesc.mockResolvedValue([loaded]);

		const result = await service.findAllWithApplications();

		expect(result.data).toHaveLength(1);
		expect(result.data?.[0]).toBe(loaded);
		expect(result.data?.[0].applications).toEqual([]);
	});

	it('nests applications and roles under each user', async () => {
		users.findAllWithApplicationsOrderedByCreatedAtDesc.mockResolvedValue([
			user(1, { applications: [applicationAssignment(iam, [admin])] }),
			user(2, { applications: [applicationAssignment(hub, [viewer])] }),
		]);

		const result = await service.findAllWithApplications();

		expect(
			(result.data ?? []).map((entry) => [
				entry.id,
				entry.applications.map((row) => [
					(row as unknown as { application: { name: string } }).application.name,
					(row as unknown as { roles: Array<{ role: { name: string } }> }).roles.map(
						(roleRow) => roleRow.role.name,
					),
				]),
			]),
		).toEqual([
			[1, [['iam', ['ADMIN']]]],
			[2, [['hub', ['VIEWER']]]],
		]);
	});

	it('keeps the order of the users returned by the repository', async () => {
		users.findAllWithApplicationsOrderedByCreatedAtDesc.mockResolvedValue([user(2), user(1)]);

		const result = await service.findAllWithApplications();

		expect((result.data ?? []).map((entry) => entry.id)).toEqual([2, 1]);
	});

	it('keeps the order of applications and roles the repository returns (newest first)', async () => {
		users.findAllWithApplicationsOrderedByCreatedAtDesc.mockResolvedValue([
			user(1, {
				applications: [applicationAssignment(hub), applicationAssignment(iam, [editor, admin])],
			}),
		]);

		const result = await service.findAllWithApplications();

		const applications = (result.data?.[0].applications ?? []) as unknown as Array<{
			applicationId: number;
			roles: Array<{ roleId: number }>;
		}>;
		expect(applications.map((application) => application.applicationId)).toEqual([20, 10]);
		expect(applications[1].roles.map((role) => role.roleId)).toEqual([101, 100]);
	});

	it('loads everything with a single repository call', async () => {
		await service.findAllWithApplications();

		expect(users.findAllWithApplicationsOrderedByCreatedAtDesc).toHaveBeenCalledTimes(1);
	});

	it('propagates a repository failure', async () => {
		const failure = new Error('db down');
		users.findAllWithApplicationsOrderedByCreatedAtDesc.mockRejectedValue(failure);

		await expect(service.findAllWithApplications()).rejects.toBe(failure);
	});
});
