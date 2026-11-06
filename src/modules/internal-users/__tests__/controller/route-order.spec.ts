import { describe, expect, it } from '@jest/globals';
import { PATH_METADATA } from '@nestjs/common/constants';
import { InternalUsersController } from '../../internal-users.controller';
import { prototypeMethod } from '../../../../../test/helpers/mocks';

describe('InternalUsersController route order', () => {
	const routes = () =>
		Object.getOwnPropertyNames(InternalUsersController.prototype)
			.filter((name) => name !== 'constructor')
			.map((name) => ({
				name,
				path: Reflect.getMetadata(
					PATH_METADATA,
					prototypeMethod(InternalUsersController.prototype, name as 'create'),
				) as string,
			}));

	it.each(['by-role', 'with-applications'])(
		'declares GET %s before any ":id" route so it is not captured as an id',
		(staticPath) => {
			const order = routes();
			const staticIndex = order.findIndex((route) => route.path === staticPath);
			const firstIdRoute = order.findIndex((route) => route.path.startsWith(':id'));

			expect(staticIndex).toBeGreaterThanOrEqual(0);
			expect(staticIndex).toBeLessThan(firstIdRoute);
		},
	);
});
