import { describe, expect, it } from '@jest/globals';
import { RoleEntity } from '../../../../common/database/role/role.entity';
import { RoleMapper } from '../../role.mapper';

describe('RoleMapper.toEntity', () => {
  it('builds an entity from the dto', () => {
    const entity = RoleMapper.toEntity({
      applicationId: 3,
      name: 'ADMIN',
      description: 'Administrator',
    });

    expect(entity).toBeInstanceOf(RoleEntity);
    expect(entity).toMatchObject({
      applicationId: 3,
      name: 'ADMIN',
      description: 'Administrator',
    });
  });

  it('leaves the id unset', () => {
    const entity = RoleMapper.toEntity({
      applicationId: 3,
      name: 'ADMIN',
      description: 'd',
    });

    expect(entity.id).toBeUndefined();
  });
});

describe('RoleMapper.toResponse', () => {
  it('exposes id, applicationId, name and description', () => {
    const entity = Object.assign(new RoleEntity(), {
      id: 9,
      applicationId: 3,
      name: 'ADMIN',
      description: 'Administrator',
    });

    expect(RoleMapper.toResponse(entity)).toEqual({
      id: 9,
      applicationId: 3,
      name: 'ADMIN',
      description: 'Administrator',
    });
  });
});
