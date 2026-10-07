import { describe, expect, it } from '@jest/globals';
import {
  AppUserPayloadJwt,
  AppUserPayloadJwtBuilder,
} from '../app-user-payload-jwt';

const apps = {
  application: { id: 1, name: 'iam', description: 'Identity', roles: [] },
};

describe('AppUserPayloadJwt.builder', () => {
  it('returns a builder', () => {
    expect(AppUserPayloadJwt.builder()).toBeInstanceOf(
      AppUserPayloadJwtBuilder,
    );
  });

  it('builds the payload with every claim', () => {
    const payload = AppUserPayloadJwt.builder()
      .withSub(7)
      .withClienteId('client-1')
      .withApps(apps)
      .withOrigin('iam')
      .build();

    expect(payload).toEqual({
      sub: 7,
      clienteId: 'client-1',
      apps,
      origin: 'iam',
    });
  });

  it('accepts a sub of 0', () => {
    const payload = AppUserPayloadJwt.builder()
      .withSub(0)
      .withClienteId('client-1')
      .withApps(apps)
      .withOrigin('iam')
      .build();

    expect(payload.sub).toBe(0);
  });

  it('throws when sub is missing', () => {
    const builder = AppUserPayloadJwt.builder()
      .withClienteId('client-1')
      .withApps(apps)
      .withOrigin('iam');

    expect(() => builder.build()).toThrow(
      'AppUserPayloadJwt.Builder: sub is required',
    );
  });

  it('throws when clienteId is missing', () => {
    const builder = AppUserPayloadJwt.builder()
      .withSub(7)
      .withApps(apps)
      .withOrigin('iam');

    expect(() => builder.build()).toThrow(
      'AppUserPayloadJwt.Builder: clienteId is required',
    );
  });

  it('throws when apps is missing', () => {
    const builder = AppUserPayloadJwt.builder()
      .withSub(7)
      .withClienteId('client-1')
      .withOrigin('iam');

    expect(() => builder.build()).toThrow(
      'AppUserPayloadJwt.Builder: apps is required',
    );
  });

  it('throws when origin is missing', () => {
    const builder = AppUserPayloadJwt.builder()
      .withSub(7)
      .withClienteId('client-1')
      .withApps(apps);

    expect(() => builder.build()).toThrow(
      'AppUserPayloadJwt.Builder: origin is required',
    );
  });
});
