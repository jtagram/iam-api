import { beforeEach, describe, expect, it } from '@jest/globals';
import { mockFn } from '../../../../../test/helpers/mocks';
import { ApplicationsRepository } from '../../../../common/database/application/applications.repository';
import { InternalUsersRepository } from '../../../../common/database/internal-user/internal-users.repository';
import { RolesRepository } from '../../../../common/database/role/roles.repository';
import { InternalUsersService } from '../../internal-users.service';

describe('InternalUsersService.findByApplicationAndRoles', () => {
	let users: { findByApplicationAndRoleNames: ReturnType<typeof mockFn> };
	let service: InternalUsersService;

	beforeEach(() => {
		users = { findByApplicationAndRoleNames: mockFn() };
		service = new InternalUsersService(
			users as unknown as InternalUsersRepository,
			{} as unknown as ApplicationsRepository,
			{} as unknown as RolesRepository,
		);
		users.findByApplicationAndRoleNames.mockResolvedValue([]);
	});

	it('looks the users up by application name and the comma-separated role names', async () => {
		await service.findByApplicationAndRoles({
			applicationName: 'ticket-hub',
			roles: 'ADMIN,APPROVER',
		});

		expect(users.findByApplicationAndRoleNames).toHaveBeenCalledWith('ticket-hub', [
			'ADMIN',
			'APPROVER',
		]);
	});

	it('trims spaces around the role names', async () => {
		await service.findByApplicationAndRoles({
			applicationName: 'ticket-hub',
			roles: ' ADMIN , APPROVER ',
		});

		expect(users.findByApplicationAndRoleNames).toHaveBeenCalledWith('ticket-hub', [
			'ADMIN',
			'APPROVER',
		]);
	});

	it('drops empty entries produced by stray commas', async () => {
		await service.findByApplicationAndRoles({
			applicationName: 'ticket-hub',
			roles: ',ADMIN,, ,',
		});

		expect(users.findByApplicationAndRoleNames).toHaveBeenCalledWith('ticket-hub', ['ADMIN']);
	});

	it('passes no role names when the list only has separators', async () => {
		await service.findByApplicationAndRoles({ applicationName: 'ticket-hub', roles: ' , ,' });

		expect(users.findByApplicationAndRoleNames).toHaveBeenCalledWith('ticket-hub', []);
	});

	it('returns the matching users without their password', async () => {
		users.findByApplicationAndRoleNames.mockResolvedValue([
			{ id: 1, name: 'Ada', lastname: 'L', email: 'a@example.com', password: 'HASH' },
			{ id: 2, name: 'Bob', lastname: 'M', email: 'b@example.com', password: 'HASH' },
		]);

		const result = await service.findByApplicationAndRoles({
			applicationName: 'ticket-hub',
			roles: 'ADMIN',
		});

		expect(result).toEqual({
			ok: true,
			msg: 'Internal users retrieved successfully',
			data: [
				{ id: 1, name: 'Ada', lastname: 'L', email: 'a@example.com' },
				{ id: 2, name: 'Bob', lastname: 'M', email: 'b@example.com' },
			],
		});
	});

	it('returns an empty list when nobody matches', async () => {
		await expect(
			service.findByApplicationAndRoles({ applicationName: 'ghost', roles: 'GHOST' }),
		).resolves.toEqual({ ok: true, msg: 'Internal users retrieved successfully', data: [] });
	});

	it('propagates a repository failure', async () => {
		const failure = new Error('db down');
		users.findByApplicationAndRoleNames.mockRejectedValue(failure);

		await expect(
			service.findByApplicationAndRoles({ applicationName: 'ticket-hub', roles: 'ADMIN' }),
		).rejects.toBe(failure);
	});
});
