import { describe, expect, it } from '@jest/globals';
import { AppUserEntity, AppUserEntityBuilder } from '../app-user.entity';

describe('AppUserEntity.builder', () => {
  it('returns a builder', () => {
    expect(AppUserEntity.builder()).toBeInstanceOf(AppUserEntityBuilder);
  });

  it('builds an entity with every field', () => {
    const entity = AppUserEntity.builder()
      .withClienteId('abc123')
      .withClienteSecret('hashed-secret')
      .withName('Service')
      .withDescription('A service client')
      .build();

    expect(entity).toBeInstanceOf(AppUserEntity);
    expect(entity).toMatchObject({
      clienteId: 'abc123',
      clienteSecret: 'hashed-secret',
      name: 'Service',
      description: 'A service client',
    });
  });

  it('leaves the id unset so the database generates it', () => {
    const entity = AppUserEntity.builder()
      .withClienteId('abc123')
      .withClienteSecret('hashed-secret')
      .withName('Service')
      .withDescription('A service client')
      .build();

    expect(entity.id).toBeUndefined();
  });

  it('throws when clienteId is missing', () => {
    const builder = AppUserEntity.builder()
      .withClienteSecret('hashed-secret')
      .withName('Service')
      .withDescription('A service client');

    expect(() => builder.build()).toThrow(
      'AppUserEntity.Builder: clienteId is required',
    );
  });

  it('throws when clienteSecret is missing', () => {
    const builder = AppUserEntity.builder()
      .withClienteId('abc123')
      .withName('Service')
      .withDescription('A service client');

    expect(() => builder.build()).toThrow(
      'AppUserEntity.Builder: clienteSecret is required',
    );
  });

  it('throws when name is missing', () => {
    const builder = AppUserEntity.builder()
      .withClienteId('abc123')
      .withClienteSecret('hashed-secret')
      .withDescription('A service client');

    expect(() => builder.build()).toThrow(
      'AppUserEntity.Builder: name is required',
    );
  });

  it('throws when description is missing', () => {
    const builder = AppUserEntity.builder()
      .withClienteId('abc123')
      .withClienteSecret('hashed-secret')
      .withName('Service');

    expect(() => builder.build()).toThrow(
      'AppUserEntity.Builder: description is required',
    );
  });
});
