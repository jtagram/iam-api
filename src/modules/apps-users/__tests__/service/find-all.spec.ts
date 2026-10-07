import { beforeEach, describe, expect, it } from '@jest/globals';
import { mockFn } from '../../../../../test/helpers/mocks';
import { AppUsersRepository } from '../../../../common/database/app-user/app-users.repository';
import { AppUsersService } from '../../apps-users.service';

describe('AppUsersService.findAll', () => {
  let repository: { findAll: ReturnType<typeof mockFn> };
  let service: AppUsersService;

  beforeEach(() => {
    repository = { findAll: mockFn() };
    service = new AppUsersService(
      repository as unknown as AppUsersRepository,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
  });

  it('maps every user without exposing the secret hash', async () => {
    repository.findAll.mockResolvedValue([
      {
        id: 1,
        clienteId: 'a',
        clienteSecret: 'HASH',
        name: 'A',
        description: 'da',
      },
      {
        id: 2,
        clienteId: 'b',
        clienteSecret: 'HASH',
        name: 'B',
        description: 'db',
      },
    ]);

    const result = await service.findAll();

    expect(result).toEqual({
      msg: 'Application users retrieved successfully',
      data: [
        { id: 1, clienteId: 'a', name: 'A', description: 'da' },
        { id: 2, clienteId: 'b', name: 'B', description: 'db' },
      ],
    });
    expect(JSON.stringify(result)).not.toContain('HASH');
  });

  it('returns an empty list when there are no users', async () => {
    repository.findAll.mockResolvedValue([]);

    await expect(service.findAll()).resolves.toEqual({
      msg: 'Application users retrieved successfully',
      data: [],
    });
  });

  it('propagates a repository failure', async () => {
    const failure = new Error('db down');
    repository.findAll.mockRejectedValue(failure);

    await expect(service.findAll()).rejects.toBe(failure);
  });
});
