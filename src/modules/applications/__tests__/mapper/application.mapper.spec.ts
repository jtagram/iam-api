import { describe, expect, it } from '@jest/globals';
import { ApplicationEntity } from '../../../../common/database/application/application.entity';
import { ApplicationMapper } from '../../application.mapper';

describe('ApplicationMapper.toEntity', () => {
  it('builds an entity from the dto', () => {
    const entity = ApplicationMapper.toEntity({
      name: 'iam',
      description: 'Identity',
    });

    expect(entity).toBeInstanceOf(ApplicationEntity);
    expect(entity).toMatchObject({ name: 'iam', description: 'Identity' });
  });

  it('leaves the id unset', () => {
    const entity = ApplicationMapper.toEntity({
      name: 'iam',
      description: 'd',
    });

    expect(entity.id).toBeUndefined();
  });
});

describe('ApplicationMapper.toResponse', () => {
  it('exposes id, name and description', () => {
    const entity = Object.assign(new ApplicationEntity(), {
      id: 4,
      name: 'iam',
      description: 'Identity',
    });

    expect(ApplicationMapper.toResponse(entity)).toEqual({
      id: 4,
      name: 'iam',
      description: 'Identity',
    });
  });
});
