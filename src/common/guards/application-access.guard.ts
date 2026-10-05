import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthenticatedUser } from '../jwt/authenticated-user';
import { IS_PUBLIC_KEY } from './public.decorator';

const MISSING_USER_MESSAGE =
  'ApplicationAccessGuard ran without an authenticated user - JwtAuthGuard must run first';
const WRONG_APPLICATION_MESSAGE =
  'This token was not issued for the iam application';

/**
 * Every non-public iam-api route only accepts tokens issued for this exact
 * application (`IAM_APPLICATION_NAME`, matching what the `iam` frontend sends
 * as `x-application-name`). Without this, a valid token from an unrelated app
 * (e.g. "ticket-hub") would reach any route that has no `@Roles()`, and role
 * names collide across applications by design.
 */
@Injectable()
export class ApplicationAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
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

    return true;
  }
}
