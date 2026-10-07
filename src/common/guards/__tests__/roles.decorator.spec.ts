import { describe, expect, it } from '@jest/globals';
import { Role } from '../../database/role/role.enum';
import { ROLES_KEY, Roles } from '../roles.decorator';

describe('Roles', () => {
  it('exposes the metadata key used by the guard', () => {
    expect(ROLES_KEY).toBe('roles');
  });

  it('stores the required roles on a handler', () => {
    class Controller {
      @Roles(Role.ADMIN)
      handler() {}
    }

    expect(
      Reflect.getMetadata(ROLES_KEY, Controller.prototype.handler),
    ).toEqual([Role.ADMIN]);
  });

  it('stores the required roles on a controller class', () => {
    @Roles(Role.ADMIN)
    class Controller {}

    expect(Reflect.getMetadata(ROLES_KEY, Controller)).toEqual([Role.ADMIN]);
  });

  it('stores an empty list when no role is passed', () => {
    class Controller {
      @Roles()
      handler() {}
    }

    expect(
      Reflect.getMetadata(ROLES_KEY, Controller.prototype.handler),
    ).toEqual([]);
  });
});
