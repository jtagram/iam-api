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
import { UserAppEntity } from '../user-app.entity';
import { UserAppsRepository } from '../user-apps.repository';

function build(appUserId: number, applicationId: number): UserAppEntity {
  const entity = new UserAppEntity();
  entity.appUserId = appUserId;
  entity.applicationId = applicationId;
  return entity;
}

describe('UserAppsRepository (in-memory db)', () => {
  let dataSource: DataSource;
  let typeormRepository: Repository<UserAppEntity>;
  let repository: UserAppsRepository;

  beforeAll(async () => {
    dataSource = await createInMemoryDataSource([UserAppEntity]);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    jest.restoreAllMocks();
    typeormRepository = dataSource.getRepository(UserAppEntity);
    await typeormRepository.clear();
    repository = new UserAppsRepository(typeormRepository);
  });

  describe('createAssignment', () => {
    it('persists the assignment and returns it with a generated id', async () => {
      const saved = await repository.createAssignment(build(1, 10));

      expect(saved).toMatchObject({
        id: expect.any(Number),
        appUserId: 1,
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

  describe('existsForAppUserAndApplication', () => {
    it('returns true when the pair is assigned', async () => {
      await repository.createAssignment(build(1, 10));

      await expect(
        repository.existsForAppUserAndApplication(1, 10),
      ).resolves.toBe(true);
    });

    it('returns false for another application of the same user', async () => {
      await repository.createAssignment(build(1, 10));

      await expect(
        repository.existsForAppUserAndApplication(1, 11),
      ).resolves.toBe(false);
    });

    it('returns false for the same application of another user', async () => {
      await repository.createAssignment(build(1, 10));

      await expect(
        repository.existsForAppUserAndApplication(2, 10),
      ).resolves.toBe(false);
    });
  });

  describe('findAllByAppUserId', () => {
    it('returns only the assignments of that user', async () => {
      await repository.createAssignment(build(1, 10));
      await repository.createAssignment(build(1, 11));
      await repository.createAssignment(build(2, 12));

      const found = await repository.findAllByAppUserId(1);

      expect(found.map((row) => row.applicationId).sort()).toEqual([10, 11]);
    });

    it('returns an empty list for a user without assignments', async () => {
      await expect(repository.findAllByAppUserId(9)).resolves.toEqual([]);
    });
  });
});
