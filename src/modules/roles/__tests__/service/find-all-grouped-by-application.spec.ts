import { beforeEach, describe, expect, it } from '@jest/globals';
import { mockFn } from '../../../../../test/helpers/mocks';
import { ApplicationsRepository } from '../../../../common/database/application/applications.repository';
import { RolesRepository } from '../../../../common/database/role/roles.repository';
import { RolesService } from '../../roles.service';

describe('RolesService.findAllGroupedByApplication', () => {
	let applicationsRepository: {
		findAllWithRolesOrderedByCreatedAtDesc: ReturnType<typeof mockFn>;
	};
	let service: RolesService;

	beforeEach(() => {
		applicationsRepository = { findAllWithRolesOrderedByCreatedAtDesc: mockFn() };
		service = new RolesService(
			{} as unknown as RolesRepository,
			applicationsRepository as unknown as ApplicationsRepository,
		);
	});

	it('maps the roles loaded with each application using a single query', async () => {
		applicationsRepository.findAllWithRolesOrderedByCreatedAtDesc.mockResolvedValue([
			{
				id: 1,
				name: 'iam',
				description: 'Identity',
				roles: [
					{ id: 1, applicationId: 1, name: 'ADMIN', description: 'Admin' },
					{ id: 2, applicationId: 1, name: 'VIEWER', description: 'Viewer' },
				],
			},
			{ id: 2, name: 'billing', description: 'Billing', roles: [] },
		]);

		await expect(service.findAllGroupedByApplication()).resolves.toEqual({
			ok: true,
			msg: 'Roles grouped by application retrieved successfully',
			data: [
				{
					applicationId: 1,
					applicationName: 'iam',
					applicationDescription: 'Identity',
					roles: [
						{ id: 1, name: 'ADMIN', description: 'Admin' },
						{ id: 2, name: 'VIEWER', description: 'Viewer' },
					],
				},
				{
					applicationId: 2,
					applicationName: 'billing',
					applicationDescription: 'Billing',
					roles: [],
				},
			],
		});
		expect(applicationsRepository.findAllWithRolesOrderedByCreatedAtDesc).toHaveBeenCalledTimes(1);
	});

	it('returns an empty list when there are no applications', async () => {
		applicationsRepository.findAllWithRolesOrderedByCreatedAtDesc.mockResolvedValue([]);

		await expect(service.findAllGroupedByApplication()).resolves.toEqual({
			ok: true,
			msg: 'Roles grouped by application retrieved successfully',
			data: [],
		});
	});

	it('propagates a repository failure', async () => {
		const failure = new Error('db down');
		applicationsRepository.findAllWithRolesOrderedByCreatedAtDesc.mockRejectedValue(failure);

		await expect(service.findAllGroupedByApplication()).rejects.toBe(failure);
	});
});
