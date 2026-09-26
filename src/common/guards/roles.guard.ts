import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Role } from '../database/role/role.enum';
import { AuthenticatedUser } from '../jwt/authenticated-user';
import { ROLES_KEY } from './roles.decorator';

const MISSING_USER_MESSAGE =
  'RolesGuard ran without an authenticated user - JwtAuthGuard must run first';
const WRONG_APPLICATION_MESSAGE =
  'This token was not issued for the iam application';
const INSUFFICIENT_ROLE_MESSAGE = 'You do not have the required role';

/**
 * `@Roles()` only ever protects iam-api's own endpoints (creating
 * applications/roles, managing app-users and internal-users) -- it never
 * guards another service's routes. A token is only valid proof of an iam-api
 * role when it was issued for this exact application (`IAM_APPLICATION_NAME`,
 * matching what the `iam` frontend sends as `x-application-name`); otherwise
 * an ADMIN of some unrelated app (e.g. "ticket-hub") would satisfy
 * `@Roles(Role.ADMIN)` here too, since role names collide across
 * applications by design.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();

    if (!request.user) {
      throw new ForbiddenException(MISSING_USER_MESSAGE);
    }

    const iamApplicationName = this.configService.get<string>(
      'IAM_APPLICATION_NAME',
    );
    if (request.user.apps.application.name !== iamApplicationName) {
      throw new ForbiddenException(WRONG_APPLICATION_MESSAGE);
    }

    if (!hasOneOfRoles(request.user, requiredRoles)) {
      throw new ForbiddenException(INSUFFICIENT_ROLE_MESSAGE);
    }

    return true;
  }
}

function hasOneOfRoles(
  user: AuthenticatedUser,
  requiredRoles: Role[],
): boolean {
  const roleNames = user.apps.application.roles.map((role) => role.name);
  return requiredRoles.some((requiredRole) => roleNames.includes(requiredRole));
}
