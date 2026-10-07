import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../database/role/role.enum';
import { IS_PUBLIC_KEY } from '../public.decorator';
import { ROLES_KEY } from '../roles.decorator';
import { RolesGuard } from '../roles.guard';

const buildUser = (roleNames: string[]) => ({
  apps: {
    application: {
      id: 1,
      name: 'iam',
      description: 'IAM',
      roles: roleNames.map((name, index) => ({
        id: index + 1,
        name,
        description: '',
      })),
    },
  },
});

describe('RolesGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: RolesGuard;
  const handler = function handler() {};
  class Controller {}

  const mockMetadata = (isPublic: boolean | undefined, roles?: Role[]) => {
    reflector.getAllAndOverride.mockImplementation((key: unknown) =>
      key === IS_PUBLIC_KEY ? isPublic : roles,
    );
  };

  const buildContext = (user?: unknown): ExecutionContext =>
    ({
      getHandler: () => handler,
      getClass: () => Controller,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  describe('public routes', () => {
    it('allows a public route without user nor roles', () => {
      mockMetadata(true);

      expect(guard.canActivate(buildContext())).toBe(true);
    });

    it('reads the public flag from the handler and the class', () => {
      mockMetadata(true);

      guard.canActivate(buildContext());

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        handler,
        Controller,
      ]);
    });
  });

  describe('deny by default', () => {
    it('throws Forbidden when the route declares no roles', () => {
      mockMetadata(undefined, undefined);

      expect(() =>
        guard.canActivate(buildContext(buildUser(['ADMIN']))),
      ).toThrow(
        new ForbiddenException(
          'This route does not declare the roles allowed to access it',
        ),
      );
    });

    it('throws Forbidden when the route declares an empty roles list', () => {
      mockMetadata(undefined, []);

      expect(() =>
        guard.canActivate(buildContext(buildUser(['ADMIN']))),
      ).toThrow('This route does not declare the roles allowed to access it');
    });

    it('reads the roles metadata from the handler and the class', () => {
      mockMetadata(undefined, [Role.ADMIN]);

      guard.canActivate(buildContext(buildUser(['ADMIN'])));

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        handler,
        Controller,
      ]);
    });
  });

  describe('protected routes', () => {
    beforeEach(() => {
      mockMetadata(undefined, [Role.ADMIN]);
    });

    it('throws Forbidden when there is no authenticated user', () => {
      expect(() => guard.canActivate(buildContext())).toThrow(
        new ForbiddenException(
          'RolesGuard ran without an authenticated user - JwtAuthGuard must run first',
        ),
      );
    });

    it('allows a user holding the required role', () => {
      expect(guard.canActivate(buildContext(buildUser(['ADMIN'])))).toBe(true);
    });

    it('allows a user holding the required role among others', () => {
      expect(
        guard.canActivate(buildContext(buildUser(['VIEWER', 'ADMIN']))),
      ).toBe(true);
    });

    it('throws Forbidden when the user holds only other roles', () => {
      expect(() =>
        guard.canActivate(buildContext(buildUser(['VIEWER']))),
      ).toThrow(new ForbiddenException('You do not have the required role'));
    });

    it('throws Forbidden when the user has no roles', () => {
      expect(() => guard.canActivate(buildContext(buildUser([])))).toThrow(
        'You do not have the required role',
      );
    });

    it('compares role names case-sensitively', () => {
      expect(() =>
        guard.canActivate(buildContext(buildUser(['admin']))),
      ).toThrow('You do not have the required role');
    });

    it('throws a TypeError when the user has no apps claim (current behavior)', () => {
      expect(() => guard.canActivate(buildContext({ sub: 1 }))).toThrow(
        TypeError,
      );
    });
  });
});
