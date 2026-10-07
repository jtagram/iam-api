import { beforeEach, describe, expect, it } from '@jest/globals';
import { RequestMethod } from '@nestjs/common';
import { mockFn } from '../../../../../test/helpers/mocks';
import {
  basePathOf,
  bodyParamsOf,
  customParamsOf,
  routeOf,
} from '../../../../../test/helpers/route-metadata';
import {
  APPLICATION_NAME_HEADER,
  TARGET_APPLICATION_HEADER,
} from '../../../../common/decorators/application-name.decorator';
import { InternalUsersLoginController } from '../../internal-users-login.controller';
import { LoginInternalUserDto } from '../../dto/login-internal-user.dto';
import { InternalUsersLoginService } from '../../internal-users-login.service';

describe('InternalUsersLoginController.login', () => {
  let service: { login: ReturnType<typeof mockFn> };
  let controller: InternalUsersLoginController;

  beforeEach(() => {
    service = { login: mockFn() };
    controller = new InternalUsersLoginController(
      service as unknown as InternalUsersLoginService,
    );
  });

  it('delegates the dto, the origin and the target application to the service', async () => {
    const dto = { a: 1 } as never;
    const response = { access_token: 'token' };
    service.login.mockResolvedValue(response);

    await expect(controller.login(dto, 'iam', 'ticket-hub')).resolves.toBe(
      response,
    );

    expect(service.login).toHaveBeenCalledTimes(1);
    expect(service.login).toHaveBeenCalledWith(dto, 'iam', 'ticket-hub');
  });

  it('propagates a service rejection', async () => {
    const failure = new Error('boom');
    service.login.mockRejectedValue(failure);

    await expect(
      controller.login({} as never, 'iam', 'ticket-hub'),
    ).rejects.toBe(failure);
  });

  it('is mounted at POST /internal-users/login', () => {
    const info = routeOf(InternalUsersLoginController, 'login');

    expect(basePathOf(InternalUsersLoginController)).toBe('internal-users');
    expect(info.method).toBe(RequestMethod.POST);
    expect(info.path).toBe('login');
  });

  it('answers with status 200 instead of the default 201', () => {
    expect(routeOf(InternalUsersLoginController, 'login').httpCode).toBe(200);
  });

  it('is public (nobody has a token before logging in)', () => {
    expect(routeOf(InternalUsersLoginController, 'login').isPublic).toBe(true);
  });

  it('does not require any role', () => {
    expect(
      routeOf(InternalUsersLoginController, 'login').roles,
    ).toBeUndefined();
  });

  it('reads the body as LoginInternalUserDto', () => {
    const params = bodyParamsOf(InternalUsersLoginController, 'login');
    const types = Reflect.getMetadata(
      'design:paramtypes',
      InternalUsersLoginController.prototype,
      'login',
    );

    expect(params).toHaveLength(1);
    expect(types[params[0].index]).toBe(LoginInternalUserDto);
  });

  it('takes the origin application from the x-application-name header', () => {
    const [origin] = customParamsOf(InternalUsersLoginController, 'login');
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            [APPLICATION_NAME_HEADER]: 'iam',
            [TARGET_APPLICATION_HEADER]: 'ticket-hub',
          },
        }),
      }),
    };

    expect(origin.index).toBe(1);
    expect(origin.factory(undefined, context)).toBe('iam');
  });

  it('takes the target application from the x-target-application header', () => {
    const [, target] = customParamsOf(InternalUsersLoginController, 'login');
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            [APPLICATION_NAME_HEADER]: 'iam',
            [TARGET_APPLICATION_HEADER]: 'ticket-hub',
          },
        }),
      }),
    };

    expect(target.index).toBe(2);
    expect(target.factory(undefined, context)).toBe('ticket-hub');
  });
});
