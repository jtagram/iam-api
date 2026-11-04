import { beforeEach, describe, expect, it } from '@jest/globals';
import { RequestMethod } from '@nestjs/common';
import { basePathOf, routeOf } from '../../../../../test/helpers/route-metadata';
import { mockFn } from '../../../../../test/helpers/mocks';
import { Role } from '../../../../common/database/role/role.enum';
import { RolesController } from '../../roles.controller';
import { RolesService } from '../../roles.service';

describe('RolesController.findAllGroupedByApplication', () => {
	let service: { findAllGroupedByApplication: ReturnType<typeof mockFn> };
	let controller: RolesController;

	beforeEach(() => {
		service = { findAllGroupedByApplication: mockFn() };
		controller = new RolesController(service as unknown as RolesService);
	});

	it('delegates to RolesService.findAllGroupedByApplication and returns its result', async () => {
		const result = { ok: true, msg: 'ok', data: [] };
		service.findAllGroupedByApplication.mockResolvedValue(result);

		await expect(controller.findAllGroupedByApplication()).resolves.toBe(result);

		expect(service.findAllGroupedByApplication).toHaveBeenCalledTimes(1);
	});

	it('is mounted at GET /roles/grouped-by-application', () => {
		const info = routeOf(RolesController, 'findAllGroupedByApplication');

		expect(basePathOf(RolesController)).toBe('roles');
		expect(info.method).toBe(RequestMethod.GET);
		expect(info.path).toBe('grouped-by-application');
	});

	it('requires the ADMIN role and keeps the default status code', () => {
		const info = routeOf(RolesController, 'findAllGroupedByApplication');

		expect(info.roles).toEqual([Role.ADMIN]);
		expect(info.isPublic).toBeUndefined();
		expect(info.httpCode).toBeUndefined();
	});
});
