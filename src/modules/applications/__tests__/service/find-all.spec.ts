import { beforeEach, describe, expect, it } from '@jest/globals';
import { mockFn } from '../../../../../test/helpers/mocks';
import { ApplicationsRepository } from '../../../../common/database/application/applications.repository';
import { ApplicationsService } from '../../applications.service';

describe('ApplicationsService.findAll', () => {
  let repository: { findAll: ReturnType<typeof mockFn> };
  let service: ApplicationsService;

  beforeEach(() => {
    repository = { findAll: mockFn() };
    service = new ApplicationsService(
      repository as unknown as ApplicationsRepository,
    );
  });

  it('maps every application to its response shape', async () => {
    repository.findAll.mockResolvedValue([
      { id: 1, name: 'iam', description: 'Identity', secret: 'hidden' },
      { id: 2, name: 'hub', description: 'Tickets' },
    ]);

    await expect(service.findAll()).resolves.toEqual({
      msg: 'Applications retrieved successfully',
      data: [
        { id: 1, name: 'iam', description: 'Identity' },
        { id: 2, name: 'hub', description: 'Tickets' },
      ],
    });
  });

  it('returns an empty list when there are no applications', async () => {
    repository.findAll.mockResolvedValue([]);

    await expect(service.findAll()).resolves.toEqual({
      msg: 'Applications retrieved successfully',
      data: [],
    });
  });

  it('propagates a repository failure', async () => {
    const failure = new Error('db down');
    repository.findAll.mockRejectedValue(failure);

    await expect(service.findAll()).rejects.toBe(failure);
  });
});
