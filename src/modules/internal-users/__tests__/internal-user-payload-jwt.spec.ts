import { describe, expect, it } from '@jest/globals';
import {
  InternalUserPayloadJwt,
  InternalUserPayloadJwtBuilder,
} from '../internal-user-payload-jwt';

const apps = {
  application: { id: 1, name: 'iam', description: 'Identity', roles: [] },
};

describe('InternalUserPayloadJwt.builder', () => {
  it('returns a builder', () => {
    expect(InternalUserPayloadJwt.builder()).toBeInstanceOf(
      InternalUserPayloadJwtBuilder,
    );
  });

  it('builds the payload with every claim', () => {
    const payload = InternalUserPayloadJwt.builder()
      .withSub(7)
      .withEmail('ada@example.com')
      .withApps(apps)
      .withOrigin('iam')
      .build();

    expect(payload).toEqual({
      sub: 7,
      email: 'ada@example.com',
      apps,
      origin: 'iam',
    });
  });

  it('accepts a sub of 0', () => {
    const payload = InternalUserPayloadJwt.builder()
      .withSub(0)
      .withEmail('ada@example.com')
      .withApps(apps)
      .withOrigin('iam')
      .build();

    expect(payload.sub).toBe(0);
  });

  it('throws when sub is missing', () => {
    const builder = InternalUserPayloadJwt.builder()
      .withEmail('ada@example.com')
      .withApps(apps)
      .withOrigin('iam');

    expect(() => builder.build()).toThrow(
      'InternalUserPayloadJwt.Builder: sub is required',
    );
  });

  it('throws when email is missing', () => {
    const builder = InternalUserPayloadJwt.builder()
      .withSub(7)
      .withApps(apps)
      .withOrigin('iam');

    expect(() => builder.build()).toThrow(
      'InternalUserPayloadJwt.Builder: email is required',
    );
  });

  it('throws when apps is missing', () => {
    const builder = InternalUserPayloadJwt.builder()
      .withSub(7)
      .withEmail('ada@example.com')
      .withOrigin('iam');

    expect(() => builder.build()).toThrow(
      'InternalUserPayloadJwt.Builder: apps is required',
    );
  });

  it('throws when origin is missing', () => {
    const builder = InternalUserPayloadJwt.builder()
      .withSub(7)
      .withEmail('ada@example.com')
      .withApps(apps);

    expect(() => builder.build()).toThrow(
      'InternalUserPayloadJwt.Builder: origin is required',
    );
  });
});
