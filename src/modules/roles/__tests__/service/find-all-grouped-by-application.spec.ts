import { beforeEach, describe, expect, it } from '@jest/globals';
import { mockFn } from '../../../../../test/helpers/mocks';
import { ApplicationsRepository } from '../../../../common/database/application/applications.repository';
import { RolesRepository } from '../../../../common/database/role/roles.repository';
import { RolesService } from '../../roles.service';

describe('RolesService.findAllGroupedByApplication', () => {
	let rolesRepository: { findAllOrderedByCreatedAtDesc: ReturnType<typeof mockFn> };
	let applicationsRepository: { findAllOrderedByCreatedAtDesc: ReturnType<typeof mockFn> };
	let service: RolesService;

	beforeEach(() => {
		rolesRepository = { findAllOrderedByCreatedAtDesc: mockFn() };
		applicationsRepository = { findAllOrderedByCreatedAtDesc: mockFn() };
		service = new RolesService(
			rolesRepository as unknown as RolesRepository,
			applicationsRepository as unknown as ApplicationsRepository,
		);
	});

	it('groups the roles under their application using one query per repository', async () => {
		applicationsRepository.findAllOrderedByCreatedAtDesc.mockResolvedValue([
			{ id: 1, name: 'iam', description: 'Identity' },
			{ id: 2, name: 'billing', description: 'Billing' },
		]);
		rolesRepository.findAllOrderedByCreatedAtDesc.mockResolvedValue([
			{ id: 1, applicationId: 1, name: 'ADMIN', description: 'Admin' },
			{ id: 2, applicationId: 1, name: 'VIEWER', description: 'Viewer' },
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
		expect(applicationsRepository.findAllOrderedByCreatedAtDesc).toHaveBeenCalledTimes(1);
		expect(rolesRepository.findAllOrderedByCreatedAtDesc).toHaveBeenCalledTimes(1);
	});

	it('returns an empty list when there are no applications', async () => {
		applicationsRepository.findAllOrderedByCreatedAtDesc.mockResolvedValue([]);
		rolesRepository.findAllOrderedByCreatedAtDesc.mockResolvedValue([]);

		await expect(service.findAllGroupedByApplication()).resolves.toEqual({
			ok: true,
			msg: 'Roles grouped by application retrieved successfully',
			data: [],
		});
	});

	it('propagates a repository failure', async () => {
		const failure = new Error('db down');
		applicationsRepository.findAllOrderedByCreatedAtDesc.mockResolvedValue([]);
		rolesRepository.findAllOrderedByCreatedAtDesc.mockRejectedValue(failure);

		await expect(service.findAllGroupedByApplication()).rejects.toBe(failure);
	});
});
