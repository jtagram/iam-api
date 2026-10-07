import { describe, expect, it } from '@jest/globals';
import { PATH_METADATA } from '@nestjs/common/constants';
import { InternalUsersController } from '../../internal-users.controller';

describe('InternalUsersController route order', () => {
  it('declares GET by-role before any ":id" route so it is not captured as an id', () => {
    const order = Object.getOwnPropertyNames(InternalUsersController.prototype)
      .filter((name) => name !== 'constructor')
      .map((name) => ({
        name,
        path: Reflect.getMetadata(
          PATH_METADATA,
          InternalUsersController.prototype[name as 'create'],
        ) as string,
      }));
    const byRole = order.findIndex((route) => route.path === 'by-role');
    const firstIdRoute = order.findIndex((route) =>
      route.path.startsWith(':id'),
    );

    expect(byRole).toBeGreaterThanOrEqual(0);
    expect(byRole).toBeLessThan(firstIdRoute);
  });
});
