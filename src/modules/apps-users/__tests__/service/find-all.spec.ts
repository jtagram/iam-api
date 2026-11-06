import { beforeEach, describe, expect, it } from '@jest/globals';
import { mockFn } from '../../../../../test/helpers/mocks';
import { AppUsersRepository } from '../../../../common/database/app-user/app-users.repository';
import { AppUsersService } from '../../apps-users.service';

describe('AppUsersService.findAll', () => {
	let repository: { findAllOrderedByCreatedAtDesc: ReturnType<typeof mockFn> };
	let service: AppUsersService;

	beforeEach(() => {
		repository = { findAllOrderedByCreatedAtDesc: mockFn() };
		service = new AppUsersService(
			repository as unknown as AppUsersRepository,
			{} as never,
			{} as never,
		);
	});

	it('maps every user without exposing the secret hash', async () => {
		repository.findAllOrderedByCreatedAtDesc.mockResolvedValue([
			{
				id: 1,
				clienteId: 'a',
				clienteSecret: 'HASH',
				name: 'A',
				description: 'da',
			},
			{
				id: 2,
				clienteId: 'b',
				clienteSecret: 'HASH',
				name: 'B',
				description: 'db',
			},
		]);

		const result = await service.findAll();

		expect(result).toEqual({
			ok: true,
			msg: 'Application users retrieved successfully',
			data: [
				{ id: 1, clienteId: 'a', name: 'A', description: 'da' },
				{ id: 2, clienteId: 'b', name: 'B', description: 'db' },
			],
		});
		expect(JSON.stringify(result)).not.toContain('HASH');
	});

	it('returns an empty list when there are no users', async () => {
		repository.findAllOrderedByCreatedAtDesc.mockResolvedValue([]);

		await expect(service.findAll()).resolves.toEqual({
			ok: true,
			msg: 'Application users retrieved successfully',
			data: [],
		});
	});

	it('propagates a repository failure', async () => {
		const failure = new Error('db down');
		repository.findAllOrderedByCreatedAtDesc.mockRejectedValue(failure);

		await expect(service.findAll()).rejects.toBe(failure);
	});
});
