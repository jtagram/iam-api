import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { DataSource, Repository } from 'typeorm';
import { createInMemoryDataSource } from '../../../../../test/helpers/in-memory-db';
import { InternalUserAppEntity } from '../internal-user-app.entity';
import { InternalUserAppsRepository } from '../internal-user-apps.repository';

function build(
  internalUserId: number,
  applicationId: number,
): InternalUserAppEntity {
  const entity = new InternalUserAppEntity();
  entity.internalUserId = internalUserId;
  entity.applicationId = applicationId;
  return entity;
}

describe('InternalUserAppsRepository (in-memory db)', () => {
  let dataSource: DataSource;
  let typeormRepository: Repository<InternalUserAppEntity>;
  let repository: InternalUserAppsRepository;

  beforeAll(async () => {
    dataSource = await createInMemoryDataSource([InternalUserAppEntity]);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    jest.restoreAllMocks();
    typeormRepository = dataSource.getRepository(InternalUserAppEntity);
    await typeormRepository.clear();
    repository = new InternalUserAppsRepository(typeormRepository);
  });

  describe('createAssignment', () => {
    it('persists the assignment and returns it with a generated id', async () => {
      const saved = await repository.createAssignment(build(1, 10));

      expect(saved).toMatchObject({
        id: expect.any(Number),
        internalUserId: 1,
        applicationId: 10,
      });
      expect(await typeormRepository.count()).toBe(1);
    });

    it('does not enforce uniqueness itself (the service does)', async () => {
      await repository.createAssignment(build(1, 10));
      await repository.createAssignment(build(1, 10));

      expect(await typeormRepository.count()).toBe(2);
    });
  });

  describe('existsForInternalUserAndApplication', () => {
    it('returns true when the pair is assigned', async () => {
      await repository.createAssignment(build(1, 10));

      await expect(
        repository.existsForInternalUserAndApplication(1, 10),
      ).resolves.toBe(true);
    });

    it('returns false for another application of the same user', async () => {
      await repository.createAssignment(build(1, 10));

      await expect(
        repository.existsForInternalUserAndApplication(1, 11),
      ).resolves.toBe(false);
    });

    it('returns false for the same application of another user', async () => {
      await repository.createAssignment(build(1, 10));

      await expect(
        repository.existsForInternalUserAndApplication(2, 10),
      ).resolves.toBe(false);
    });
  });

  describe('findAllByInternalUserId', () => {
    it('returns only the assignments of that user', async () => {
      await repository.createAssignment(build(1, 10));
      await repository.createAssignment(build(1, 11));
      await repository.createAssignment(build(2, 12));

      const found = await repository.findAllByInternalUserId(1);

      expect(found.map((row) => row.applicationId).sort()).toEqual([10, 11]);
    });

    it('returns an empty list for a user without assignments', async () => {
      await expect(repository.findAllByInternalUserId(9)).resolves.toEqual([]);
    });
  });
});
