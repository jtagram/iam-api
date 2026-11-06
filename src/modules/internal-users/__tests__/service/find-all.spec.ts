import { beforeEach, describe, expect, it } from '@jest/globals';
import { mockFn } from '../../../../../test/helpers/mocks';
import { InternalUsersRepository } from '../../../../common/database/internal-user/internal-users.repository';
import { InternalUsersService } from '../../internal-users.service';

describe('InternalUsersService.findAll', () => {
	let repository: { findAllOrderedByCreatedAtDesc: ReturnType<typeof mockFn> };
	let service: InternalUsersService;

	beforeEach(() => {
		repository = { findAllOrderedByCreatedAtDesc: mockFn() };
		service = new InternalUsersService(
			repository as unknown as InternalUsersRepository,
			{} as never,
			{} as never,
		);
	});

	it('maps every user without exposing the password hash', async () => {
		repository.findAllOrderedByCreatedAtDesc.mockResolvedValue([
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

		const result = await service.findAll();

		expect(result).toEqual({
			ok: true,
			msg: 'Internal users retrieved successfully',
			data: [
				{ id: 1, name: 'Ada', lastname: 'L', email: 'a@example.com' },
				{ id: 2, name: 'Bob', lastname: 'M', email: 'b@example.com' },
			],
		});
		expect(JSON.stringify(result)).not.toContain('HASH');
	});

	it('keeps the repository order (most recently created first)', async () => {
		repository.findAllOrderedByCreatedAtDesc.mockResolvedValue([
			{ id: 2, name: 'Bob', lastname: 'M', email: 'b@example.com', password: 'HASH' },
			{ id: 1, name: 'Ada', lastname: 'L', email: 'a@example.com', password: 'HASH' },
		]);

		const result = await service.findAll();

		expect(result.data?.map((user) => user.id)).toEqual([2, 1]);
		expect(repository.findAllOrderedByCreatedAtDesc).toHaveBeenCalledTimes(1);
	});

	it('returns an empty list when there are no users', async () => {
		repository.findAllOrderedByCreatedAtDesc.mockResolvedValue([]);

		await expect(service.findAll()).resolves.toEqual({
			ok: true,
			msg: 'Internal users retrieved successfully',
			data: [],
		});
	});

	it('propagates a repository failure', async () => {
		const failure = new Error('db down');
		repository.findAllOrderedByCreatedAtDesc.mockRejectedValue(failure);

		await expect(service.findAll()).rejects.toBe(failure);
	});
});
