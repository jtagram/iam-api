import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { ApplicationAccessGuard } from '../application-access.guard';
import { IS_PUBLIC_KEY } from '../public.decorator';

const buildUser = (applicationName: string) => ({
  apps: {
    application: {
      id: 1,
      name: applicationName,
      description: '',
      roles: [],
    },
  },
});

describe('ApplicationAccessGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let configService: { get: jest.Mock };
  let guard: ApplicationAccessGuard;
  const handler = function handler() {};
  class Controller {}

  const buildContext = (user?: unknown): ExecutionContext =>
    ({
      getHandler: () => handler,
      getClass: () => Controller,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    configService = { get: jest.fn().mockReturnValue('iam') };
    guard = new ApplicationAccessGuard(
      reflector as unknown as Reflector,
      configService as unknown as ConfigService,
    );
  });

  it('allows a public route without looking at the user', () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    expect(guard.canActivate(buildContext())).toBe(true);
    expect(configService.get).not.toHaveBeenCalled();
  });

  it('reads the public flag from the handler and the class', () => {
    guard.canActivate(buildContext(buildUser('iam')));

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
      handler,
      Controller,
    ]);
  });

  it('throws Forbidden when there is no authenticated user', () => {
    expect(() => guard.canActivate(buildContext())).toThrow(
      new ForbiddenException(
        'ApplicationAccessGuard ran without an authenticated user - JwtAuthGuard must run first',
      ),
    );
  });

  it('allows a token issued for the configured iam application', () => {
    expect(guard.canActivate(buildContext(buildUser('iam')))).toBe(true);
    expect(configService.get).toHaveBeenCalledWith('IAM_APPLICATION_NAME');
  });

  it('throws Forbidden for a token issued for another application', () => {
    expect(() =>
      guard.canActivate(buildContext(buildUser('ticket-hub'))),
    ).toThrow(
      new ForbiddenException(
        'This token was not issued for the iam application',
      ),
    );
  });

  it('compares the application name case-sensitively', () => {
    expect(() => guard.canActivate(buildContext(buildUser('IAM')))).toThrow(
      'This token was not issued for the iam application',
    );
  });

  it('throws Forbidden when IAM_APPLICATION_NAME is not configured', () => {
    configService.get.mockReturnValue(undefined);

    expect(() => guard.canActivate(buildContext(buildUser('iam')))).toThrow(
      'This token was not issued for the iam application',
    );
  });

  it('throws a TypeError when the user has no apps claim (current behavior)', () => {
    expect(() => guard.canActivate(buildContext({ sub: 1 }))).toThrow(
      TypeError,
    );
  });
});
