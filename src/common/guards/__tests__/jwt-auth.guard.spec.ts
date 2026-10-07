import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import {
  generateRsaKeyPair,
  RsaKeyPair,
} from '../../../../test/helpers/rsa-keys';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../public.decorator';

const payload = {
  sub: 1,
  email: 'admin@example.com',
  origin: 'iam',
  apps: {
    application: { id: 1, name: 'iam', description: 'IAM', roles: [] },
  },
};

describe('JwtAuthGuard', () => {
  let keys: RsaKeyPair;
  let otherKeys: RsaKeyPair;
  let signer: JwtService;
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: JwtAuthGuard;
  let errorSpy: jest.SpiedFunction<typeof console.error>;
  const handler = function handler() {};
  class Controller {}

  const buildRequest = (authorization?: string) => ({
    headers: authorization === undefined ? {} : { authorization },
  });

  const buildContext = (request: object): ExecutionContext =>
    ({
      getHandler: () => handler,
      getClass: () => Controller,
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;

  beforeAll(() => {
    keys = generateRsaKeyPair();
    otherKeys = generateRsaKeyPair();
    signer = new JwtService({
      privateKey: keys.privateKey,
      signOptions: { algorithm: 'RS256' },
    });
  });

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    // Same verification setup as app.module.ts.
    const verifier = new JwtService({
      publicKey: keys.publicKey,
      verifyOptions: { algorithms: ['RS256'] },
    });
    guard = new JwtAuthGuard(verifier, reflector as unknown as Reflector);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('lets a public route through without a token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    await expect(guard.canActivate(buildContext(buildRequest()))).resolves.toBe(
      true,
    );
  });

  it('reads the public flag from the handler and the class', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    await guard.canActivate(buildContext(buildRequest()));

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
      handler,
      Controller,
    ]);
  });

  it('rejects a request without Authorization header', async () => {
    await expect(
      guard.canActivate(buildContext(buildRequest())),
    ).rejects.toThrow(
      new UnauthorizedException('Missing or malformed bearer token'),
    );
  });

  it('rejects a non-Bearer scheme', async () => {
    const token = signer.sign(payload);

    await expect(
      guard.canActivate(buildContext(buildRequest(`Basic ${token}`))),
    ).rejects.toThrow('Missing or malformed bearer token');
  });

  it('rejects "Bearer" without a token', async () => {
    await expect(
      guard.canActivate(buildContext(buildRequest('Bearer'))),
    ).rejects.toThrow('Missing or malformed bearer token');
  });

  it('rejects a lowercase "bearer" scheme', async () => {
    const token = signer.sign(payload);

    await expect(
      guard.canActivate(buildContext(buildRequest(`bearer ${token}`))),
    ).rejects.toThrow('Missing or malformed bearer token');
  });

  it('rejects a token that is not a JWT', async () => {
    await expect(
      guard.canActivate(buildContext(buildRequest('Bearer not-a-jwt'))),
    ).rejects.toThrow(new UnauthorizedException('Invalid or expired token'));
  });

  it('rejects an expired token', async () => {
    const token = signer.sign(payload, { expiresIn: -10 });

    await expect(
      guard.canActivate(buildContext(buildRequest(`Bearer ${token}`))),
    ).rejects.toThrow('Invalid or expired token');
  });

  it('rejects a token signed with a different private key', async () => {
    const forged = new JwtService({
      privateKey: otherKeys.privateKey,
      signOptions: { algorithm: 'RS256' },
    }).sign(payload);

    await expect(
      guard.canActivate(buildContext(buildRequest(`Bearer ${forged}`))),
    ).rejects.toThrow('Invalid or expired token');
  });

  it('rejects an HS256 token signed with the public key (algorithm confusion)', async () => {
    const forged = new JwtService({ secret: keys.publicKey }).sign(payload, {
      algorithm: 'HS256',
    });

    await expect(
      guard.canActivate(buildContext(buildRequest(`Bearer ${forged}`))),
    ).rejects.toThrow('Invalid or expired token');
  });

  it('rejects an unsigned token (alg none)', async () => {
    const encode = (value: object) =>
      Buffer.from(JSON.stringify(value)).toString('base64url');
    const unsigned = `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.`;

    await expect(
      guard.canActivate(buildContext(buildRequest(`Bearer ${unsigned}`))),
    ).rejects.toThrow('Invalid or expired token');
  });

  it('logs the verification failure on the console', async () => {
    await expect(
      guard.canActivate(buildContext(buildRequest('Bearer not-a-jwt'))),
    ).rejects.toThrow();

    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to verify JWT',
      expect.anything(),
    );
  });

  it('accepts a valid token and attaches the decoded payload as request.user', async () => {
    const token = signer.sign(payload);
    const request = buildRequest(`Bearer ${token}`) as {
      user?: Record<string, unknown>;
    };

    await expect(guard.canActivate(buildContext(request))).resolves.toBe(true);

    expect(request.user).toMatchObject(payload);
  });
});
