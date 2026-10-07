import { describe, expect, it } from '@jest/globals';
import {
  InternalUserEntity,
  InternalUserEntityBuilder,
} from '../internal-user.entity';

describe('InternalUserEntity.builder', () => {
  it('returns a builder', () => {
    expect(InternalUserEntity.builder()).toBeInstanceOf(
      InternalUserEntityBuilder,
    );
  });

  it('builds an entity with every field', () => {
    const entity = InternalUserEntity.builder()
      .withName('Ada')
      .withLastname('Lovelace')
      .withEmail('ada@example.com')
      .withPassword('hashed-password')
      .build();

    expect(entity).toBeInstanceOf(InternalUserEntity);
    expect(entity).toMatchObject({
      name: 'Ada',
      lastname: 'Lovelace',
      email: 'ada@example.com',
      password: 'hashed-password',
    });
  });

  it('leaves the id unset so the database generates it', () => {
    const entity = InternalUserEntity.builder()
      .withName('Ada')
      .withLastname('Lovelace')
      .withEmail('ada@example.com')
      .withPassword('hashed-password')
      .build();

    expect(entity.id).toBeUndefined();
  });

  it('throws when name is missing', () => {
    const builder = InternalUserEntity.builder()
      .withLastname('Lovelace')
      .withEmail('ada@example.com')
      .withPassword('hashed-password');

    expect(() => builder.build()).toThrow(
      'InternalUserEntity.Builder: name is required',
    );
  });

  it('throws when lastname is missing', () => {
    const builder = InternalUserEntity.builder()
      .withName('Ada')
      .withEmail('ada@example.com')
      .withPassword('hashed-password');

    expect(() => builder.build()).toThrow(
      'InternalUserEntity.Builder: lastname is required',
    );
  });

  it('throws when email is missing', () => {
    const builder = InternalUserEntity.builder()
      .withName('Ada')
      .withLastname('Lovelace')
      .withPassword('hashed-password');

    expect(() => builder.build()).toThrow(
      'InternalUserEntity.Builder: email is required',
    );
  });

  it('throws when password is missing', () => {
    const builder = InternalUserEntity.builder()
      .withName('Ada')
      .withLastname('Lovelace')
      .withEmail('ada@example.com');

    expect(() => builder.build()).toThrow(
      'InternalUserEntity.Builder: password is required',
    );
  });
});
