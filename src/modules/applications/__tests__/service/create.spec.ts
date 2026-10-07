import { beforeEach, describe, expect, it } from '@jest/globals';
import { ConflictException } from '@nestjs/common';
import { mockFn } from '../../../../../test/helpers/mocks';
import { ApplicationEntity } from '../../../../common/database/application/application.entity';
import { ApplicationsRepository } from '../../../../common/database/application/applications.repository';
import { ApplicationsService } from '../../applications.service';

const dto = { name: 'iam', description: 'Identity' };

describe('ApplicationsService.create', () => {
  let repository: {
    findByName: ReturnType<typeof mockFn>;
    createApplication: ReturnType<typeof mockFn>;
  };
  let service: ApplicationsService;

  beforeEach(() => {
    repository = { findByName: mockFn(), createApplication: mockFn() };
    service = new ApplicationsService(
      repository as unknown as ApplicationsRepository,
    );
    repository.findByName.mockResolvedValue(null);
    repository.createApplication.mockImplementation(
      async (entity: ApplicationEntity) => Object.assign(entity, { id: 7 }),
    );
  });

  it('looks the name up before creating', async () => {
    await service.create(dto);

    expect(repository.findByName).toHaveBeenCalledWith('iam');
  });

  it('throws Conflict when an application with that name exists', async () => {
    repository.findByName.mockResolvedValue({ id: 1, name: 'iam' });

    await expect(service.create(dto)).rejects.toThrow(
      new ConflictException('An application with this name already exists'),
    );
  });

  it('does not create anything when the name is taken', async () => {
    repository.findByName.mockResolvedValue({ id: 1, name: 'iam' });

    await service.create(dto).catch(() => undefined);

    expect(repository.createApplication).not.toHaveBeenCalled();
  });

  it('persists an entity built from the dto', async () => {
    await service.create(dto);

    const entity = repository.createApplication.mock.calls[0][0];
    expect(entity).toBeInstanceOf(ApplicationEntity);
    expect(entity).toMatchObject(dto);
  });

  it('returns the created application wrapped in a ResponseBody', async () => {
    await expect(service.create(dto)).resolves.toEqual({
      msg: 'Application created successfully',
      data: { id: 7, name: 'iam', description: 'Identity' },
    });
  });

  it('propagates a repository failure', async () => {
    const failure = new Error('db down');
    repository.createApplication.mockRejectedValue(failure);

    await expect(service.create(dto)).rejects.toBe(failure);
  });

  it('propagates a lookup failure without creating', async () => {
    const failure = new Error('db down');
    repository.findByName.mockRejectedValue(failure);

    await expect(service.create(dto)).rejects.toBe(failure);
    expect(repository.createApplication).not.toHaveBeenCalled();
  });
});
