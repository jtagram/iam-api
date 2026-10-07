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
import { AppUserConnectionEntity } from '../app-user-connection.entity';
import { AppUserConnectionsRepository } from '../app-user-connections.repository';

function build(
  appUserId: number,
  originApplicationId: number,
  destinationApplicationId: number,
): AppUserConnectionEntity {
  const entity = new AppUserConnectionEntity();
  entity.appUserId = appUserId;
  entity.originApplicationId = originApplicationId;
  entity.destinationApplicationId = destinationApplicationId;
  return entity;
}

describe('AppUserConnectionsRepository (in-memory db)', () => {
  let dataSource: DataSource;
  let typeormRepository: Repository<AppUserConnectionEntity>;
  let repository: AppUserConnectionsRepository;

  beforeAll(async () => {
    dataSource = await createInMemoryDataSource([AppUserConnectionEntity]);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    jest.restoreAllMocks();
    typeormRepository = dataSource.getRepository(AppUserConnectionEntity);
    await typeormRepository.clear();
    repository = new AppUserConnectionsRepository(typeormRepository);
  });

  describe('createConnection', () => {
    it('persists the connection and returns it with a generated id', async () => {
      const saved = await repository.createConnection(build(1, 10, 20));

      expect(saved).toMatchObject({
        id: expect.any(Number),
        appUserId: 1,
        originApplicationId: 10,
        destinationApplicationId: 20,
      });
      expect(await typeormRepository.count()).toBe(1);
    });

    it('allows several destinations for the same origin', async () => {
      await repository.createConnection(build(1, 10, 20));
      await repository.createConnection(build(1, 10, 21));

      expect(await typeormRepository.count()).toBe(2);
    });

    it('does not enforce uniqueness itself (the service does)', async () => {
      await repository.createConnection(build(1, 10, 20));
      await repository.createConnection(build(1, 10, 20));

      expect(await typeormRepository.count()).toBe(2);
    });
  });

  describe('existsForAppUserAndApplications', () => {
    it('returns true when the exact connection exists', async () => {
      await repository.createConnection(build(1, 10, 20));

      await expect(
        repository.existsForAppUserAndApplications(1, 10, 20),
      ).resolves.toBe(true);
    });

    it('returns false for the reversed direction', async () => {
      await repository.createConnection(build(1, 10, 20));

      await expect(
        repository.existsForAppUserAndApplications(1, 20, 10),
      ).resolves.toBe(false);
    });

    it('returns false for another destination', async () => {
      await repository.createConnection(build(1, 10, 20));

      await expect(
        repository.existsForAppUserAndApplications(1, 10, 21),
      ).resolves.toBe(false);
    });

    it('returns false for another user', async () => {
      await repository.createConnection(build(1, 10, 20));

      await expect(
        repository.existsForAppUserAndApplications(2, 10, 20),
      ).resolves.toBe(false);
    });
  });

  describe('findAllByAppUserId', () => {
    it('returns only the connections of that user', async () => {
      await repository.createConnection(build(1, 10, 20));
      await repository.createConnection(build(2, 10, 21));

      const found = await repository.findAllByAppUserId(1);

      expect(found).toHaveLength(1);
      expect(found[0].destinationApplicationId).toBe(20);
    });

    it('returns the connections ordered by id ascending', async () => {
      const first = await repository.createConnection(build(1, 10, 22));
      const second = await repository.createConnection(build(1, 10, 20));
      const third = await repository.createConnection(build(1, 10, 21));

      const found = await repository.findAllByAppUserId(1);

      expect(found.map((row) => row.id)).toEqual([
        first.id,
        second.id,
        third.id,
      ]);
    });

    it('returns an empty list for a user without connections', async () => {
      await expect(repository.findAllByAppUserId(9)).resolves.toEqual([]);
    });
  });
});
