import { beforeEach, describe, expect, it } from '@jest/globals';
import { ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { mockFn } from '../../../../../test/helpers/mocks';
import { InternalUserEntity } from '../../../../common/database/internal-user/internal-user.entity';
import { InternalUsersRepository } from '../../../../common/database/internal-user/internal-users.repository';
import { InternalUsersService } from '../../internal-users.service';

const dto = {
  name: 'Ada',
  lastname: 'Lovelace',
  email: 'ada@example.com',
  password: 'correct-horse',
};

describe('InternalUsersService.create', () => {
  let repository: {
    findByEmail: ReturnType<typeof mockFn>;
    createInternalUser: ReturnType<typeof mockFn>;
  };
  let service: InternalUsersService;

  beforeEach(() => {
    repository = { findByEmail: mockFn(), createInternalUser: mockFn() };
    service = new InternalUsersService(
      repository as unknown as InternalUsersRepository,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    repository.findByEmail.mockResolvedValue(null);
    repository.createInternalUser.mockImplementation(
      async (entity: InternalUserEntity) => Object.assign(entity, { id: 4 }),
    );
  });

  it('throws Conflict when the email is already in use', async () => {
    repository.findByEmail.mockResolvedValue({ id: 1 });

    await expect(service.create(dto)).rejects.toThrow(
      new ConflictException('Email already in use'),
    );
    expect(repository.findByEmail).toHaveBeenCalledWith('ada@example.com');
  });

  it('does not create the user when the email is in use', async () => {
    repository.findByEmail.mockResolvedValue({ id: 1 });

    await service.create(dto).catch(() => undefined);

    expect(repository.createInternalUser).not.toHaveBeenCalled();
  });

  it('persists an entity with the dto data and a hashed password', async () => {
    await service.create(dto);

    const entity = repository.createInternalUser.mock.calls[0][0];
    expect(entity).toBeInstanceOf(InternalUserEntity);
    expect(entity).toMatchObject({
      name: 'Ada',
      lastname: 'Lovelace',
      email: 'ada@example.com',
    });
  });

  it('stores a bcrypt hash with cost 10, never the plaintext password', async () => {
    await service.create(dto);

    const entity = repository.createInternalUser.mock.calls[0][0];
    expect(entity.password).not.toBe('correct-horse');
    expect(entity.password).toMatch(/^\$2[aby]\$10\$/);
    await expect(
      bcrypt.compare('correct-horse', entity.password),
    ).resolves.toBe(true);
  });

  it('returns the created user without the password', async () => {
    const result = await service.create(dto);

    expect(result).toEqual({
      id: 4,
      name: 'Ada',
      lastname: 'Lovelace',
      email: 'ada@example.com',
    });
  });

  it('propagates a repository failure', async () => {
    const failure = new Error('db down');
    repository.createInternalUser.mockRejectedValue(failure);

    await expect(service.create(dto)).rejects.toBe(failure);
  });
});
