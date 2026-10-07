import { beforeEach, describe, expect, it } from '@jest/globals';
import { mockFn } from '../../../../../test/helpers/mocks';
import { InternalUsersRepository } from '../../../../common/database/internal-user/internal-users.repository';
import { InternalUsersService } from '../../internal-users.service';

describe('InternalUsersService.findAll', () => {
  let repository: { findAll: ReturnType<typeof mockFn> };
  let service: InternalUsersService;

  beforeEach(() => {
    repository = { findAll: mockFn() };
    service = new InternalUsersService(
      repository as unknown as InternalUsersRepository,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
  });

  it('maps every user without exposing the password hash', async () => {
    repository.findAll.mockResolvedValue([
      {
        id: 1,
        name: 'Ada',
        lastname: 'L',
        email: 'a@example.com',
        password: 'HASH',
      },
      {
        id: 2,
        name: 'Bob',
        lastname: 'M',
        email: 'b@example.com',
        password: 'HASH',
      },
    ]);

    const result = await service.findAll();

    expect(result).toEqual([
      { id: 1, name: 'Ada', lastname: 'L', email: 'a@example.com' },
      { id: 2, name: 'Bob', lastname: 'M', email: 'b@example.com' },
    ]);
    expect(JSON.stringify(result)).not.toContain('HASH');
  });

  it('returns an empty list when there are no users', async () => {
    repository.findAll.mockResolvedValue([]);

    await expect(service.findAll()).resolves.toEqual([]);
  });

  it('propagates a repository failure', async () => {
    const failure = new Error('db down');
    repository.findAll.mockRejectedValue(failure);

    await expect(service.findAll()).rejects.toBe(failure);
  });
});
