import { describe, expect, it } from '@jest/globals';
import { InternalUserEntity } from '../../../../common/database/internal-user/internal-user.entity';
import { InternalUserMapper } from '../../internal-user.mapper';

const stored = Object.assign(new InternalUserEntity(), {
  id: 5,
  name: 'Ada',
  lastname: 'Lovelace',
  email: 'ada@example.com',
  password: 'HASH',
});

describe('InternalUserMapper.toEntity', () => {
  it('builds an entity from the dto and the hashed password', () => {
    const entity = InternalUserMapper.toEntity(
      {
        name: 'Ada',
        lastname: 'Lovelace',
        email: 'ada@example.com',
        password: 'plaintext',
      },
      'HASH',
    );

    expect(entity).toBeInstanceOf(InternalUserEntity);
    expect(entity).toMatchObject({
      name: 'Ada',
      lastname: 'Lovelace',
      email: 'ada@example.com',
      password: 'HASH',
    });
  });

  it('never stores the plaintext password from the dto', () => {
    const entity = InternalUserMapper.toEntity(
      { name: 'a', lastname: 'b', email: 'c@d.com', password: 'plaintext' },
      'HASH',
    );

    expect(JSON.stringify(entity)).not.toContain('plaintext');
  });
});

describe('InternalUserMapper.toCreatedResponse', () => {
  it('exposes the user without the password', () => {
    const response = InternalUserMapper.toCreatedResponse(stored);

    expect(response).toEqual({
      id: 5,
      name: 'Ada',
      lastname: 'Lovelace',
      email: 'ada@example.com',
    });
    expect(response).not.toHaveProperty('password');
  });
});

describe('InternalUserMapper.toResponse', () => {
  it('returns the same shape as toCreatedResponse', () => {
    expect(InternalUserMapper.toResponse(stored)).toEqual(
      InternalUserMapper.toCreatedResponse(stored),
    );
  });

  it('does not expose the password', () => {
    expect(InternalUserMapper.toResponse(stored)).not.toHaveProperty(
      'password',
    );
  });
});
