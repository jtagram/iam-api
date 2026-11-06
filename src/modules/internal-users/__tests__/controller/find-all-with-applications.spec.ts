import { beforeEach, describe, expect, it } from '@jest/globals';
import { RequestMethod } from '@nestjs/common';
import { basePathOf, routeOf } from '../../../../../test/helpers/route-metadata';
import { mockFn } from '../../../../../test/helpers/mocks';
import { Role } from '../../../../common/database/role/role.enum';
import { InternalUsersController } from '../../internal-users.controller';
import { InternalUsersService } from '../../internal-users.service';

describe('InternalUsersController.findAllWithApplications', () => {
	let service: { findAllWithApplications: ReturnType<typeof mockFn> };
	let controller: InternalUsersController;

	beforeEach(() => {
		service = { findAllWithApplications: mockFn() };
		controller = new InternalUsersController(service as unknown as InternalUsersService);
	});

	it('delegates to InternalUsersService.findAllWithApplications and returns its result', async () => {
		const result = { ok: true, msg: 'ok', data: [] };
		service.findAllWithApplications.mockResolvedValue(result);

		await expect(controller.findAllWithApplications()).resolves.toBe(result);

		expect(service.findAllWithApplications).toHaveBeenCalledTimes(1);
	});

	it('propagates a service rejection', async () => {
		const failure = new Error('boom');
		service.findAllWithApplications.mockRejectedValue(failure);

		await expect(controller.findAllWithApplications()).rejects.toBe(failure);
	});

	it('is mounted at GET /internal-users/with-applications', () => {
		const info = routeOf(InternalUsersController, 'findAllWithApplications');

		expect(basePathOf(InternalUsersController)).toBe('internal-users');
		expect(info.method).toBe(RequestMethod.GET);
		expect(info.path).toBe('with-applications');
	});

	it('requires the ADMIN role and keeps the default status code', () => {
		const info = routeOf(InternalUsersController, 'findAllWithApplications');

		expect(info.roles).toEqual([Role.ADMIN]);
		expect(info.isPublic).toBeUndefined();
		expect(info.httpCode).toBeUndefined();
	});
});
