import { describe, expect, it } from '@jest/globals';
import { RoleEntity, RoleEntityBuilder } from '../role.entity';

describe('RoleEntity.builder', () => {
  it('returns a builder', () => {
    expect(RoleEntity.builder()).toBeInstanceOf(RoleEntityBuilder);
  });

  it('builds an entity with every field', () => {
    const entity = RoleEntity.builder()
      .withApplicationId(1)
      .withName('ADMIN')
      .withDescription('Administrator')
      .build();

    expect(entity).toBeInstanceOf(RoleEntity);
    expect(entity).toMatchObject({
      applicationId: 1,
      name: 'ADMIN',
      description: 'Administrator',
    });
  });

  it('leaves the id unset so the database generates it', () => {
    const entity = RoleEntity.builder()
      .withApplicationId(1)
      .withName('ADMIN')
      .withDescription('Administrator')
      .build();

    expect(entity.id).toBeUndefined();
  });

  it('throws when applicationId is missing', () => {
    const builder = RoleEntity.builder()
      .withName('ADMIN')
      .withDescription('Administrator');

    expect(() => builder.build()).toThrow(
      'RoleEntity.Builder: applicationId is required',
    );
  });

  it('throws when name is missing', () => {
    const builder = RoleEntity.builder()
      .withApplicationId(1)
      .withDescription('Administrator');

    expect(() => builder.build()).toThrow(
      'RoleEntity.Builder: name is required',
    );
  });

  it('throws when description is missing', () => {
    const builder = RoleEntity.builder().withApplicationId(1).withName('ADMIN');

    expect(() => builder.build()).toThrow(
      'RoleEntity.Builder: description is required',
    );
  });
});
