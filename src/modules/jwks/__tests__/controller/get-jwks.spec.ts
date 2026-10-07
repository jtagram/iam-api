import { beforeEach, describe, expect, it } from '@jest/globals';
import { RequestMethod } from '@nestjs/common';
import { mockFn } from '../../../../../test/helpers/mocks';
import {
  basePathOf,
  routeOf,
} from '../../../../../test/helpers/route-metadata';
import { JwksController } from '../../jwks.controller';
import { JwksService } from '../../jwks.service';

describe('JwksController.getJwks', () => {
  let service: { getJwks: ReturnType<typeof mockFn> };
  let controller: JwksController;

  beforeEach(() => {
    service = { getJwks: mockFn() };
    controller = new JwksController(service as unknown as JwksService);
  });

  it('delegates to JwksService.getJwks and returns its result', () => {
    const jwks = { keys: [{ kty: 'RSA' }] };
    service.getJwks.mockReturnValue(jwks);

    expect(controller.getJwks()).toBe(jwks);
    expect(service.getJwks).toHaveBeenCalledTimes(1);
  });

  it('is mounted at GET /.well-known/jwks.json', () => {
    const info = routeOf(JwksController, 'getJwks');

    expect(basePathOf(JwksController)).toBe('.well-known');
    expect(info.method).toBe(RequestMethod.GET);
    expect(info.path).toBe('jwks.json');
  });

  it('is public (verifiers fetch it without a token)', () => {
    expect(routeOf(JwksController, 'getJwks').isPublic).toBe(true);
  });

  it('does not require any role', () => {
    expect(routeOf(JwksController, 'getJwks').roles).toBeUndefined();
  });
});
