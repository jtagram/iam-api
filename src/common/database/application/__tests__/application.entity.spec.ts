import { describe, expect, it } from '@jest/globals';
import {
  ApplicationEntity,
  ApplicationEntityBuilder,
} from '../application.entity';

describe('ApplicationEntity.builder', () => {
  it('returns a builder', () => {
    expect(ApplicationEntity.builder()).toBeInstanceOf(
      ApplicationEntityBuilder,
    );
  });

  it('builds an entity with every field', () => {
    const entity = ApplicationEntity.builder()
      .withName('iam')
      .withDescription('Identity and access')
      .build();

    expect(entity).toBeInstanceOf(ApplicationEntity);
    expect(entity).toMatchObject({
      name: 'iam',
      description: 'Identity and access',
    });
  });

  it('leaves the id unset so the database generates it', () => {
    const entity = ApplicationEntity.builder()
      .withName('iam')
      .withDescription('Identity and access')
      .build();

    expect(entity.id).toBeUndefined();
  });

  it('throws when name is missing', () => {
    const builder = ApplicationEntity.builder().withDescription(
      'Identity and access',
    );

    expect(() => builder.build()).toThrow(
      'ApplicationEntity.Builder: name is required',
    );
  });

  it('throws when description is missing', () => {
    const builder = ApplicationEntity.builder().withName('iam');

    expect(() => builder.build()).toThrow(
      'ApplicationEntity.Builder: description is required',
    );
  });
});
