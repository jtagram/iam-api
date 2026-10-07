import { describe, expect, it } from '@jest/globals';
import { AppUserEntity } from '../../../../common/database/app-user/app-user.entity';
import { AppUserMapper } from '../../app-user.mapper';

const stored = Object.assign(new AppUserEntity(), {
  id: 5,
  clienteId: 'client-1',
  clienteSecret: 'HASH',
  name: 'Billing',
  description: 'Billing service',
});

describe('AppUserMapper.toEntity', () => {
  it('builds an entity from the dto, the clienteId and the hashed secret', () => {
    const entity = AppUserMapper.toEntity(
      { name: 'Billing', description: 'Billing service' },
      'client-1',
      'HASH',
    );

    expect(entity).toBeInstanceOf(AppUserEntity);
    expect(entity).toMatchObject({
      clienteId: 'client-1',
      clienteSecret: 'HASH',
      name: 'Billing',
      description: 'Billing service',
    });
  });

  it('leaves the id unset', () => {
    const entity = AppUserMapper.toEntity(
      { name: 'n', description: 'd' },
      'c',
      'h',
    );

    expect(entity.id).toBeUndefined();
  });
});

describe('AppUserMapper.toCreatedResponse', () => {
  it('exposes the plaintext secret instead of the stored hash', () => {
    const response = AppUserMapper.toCreatedResponse(stored, 'plain-secret');

    expect(response).toEqual({
      id: 5,
      clienteId: 'client-1',
      clienteSecret: 'plain-secret',
      name: 'Billing',
      description: 'Billing service',
    });
  });
});

describe('AppUserMapper.toResponse', () => {
  it('exposes the user without any secret', () => {
    const response = AppUserMapper.toResponse(stored);

    expect(response).toEqual({
      id: 5,
      clienteId: 'client-1',
      name: 'Billing',
      description: 'Billing service',
    });
    expect(response).not.toHaveProperty('clienteSecret');
  });
});
