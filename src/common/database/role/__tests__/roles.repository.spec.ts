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
import { RoleEntity } from '../role.entity';
import { RolesRepository } from '../roles.repository';

function buildRole(
  applicationId = 1,
  name = 'ADMIN',
  description = 'Administrator',
) {
  return RoleEntity.builder()
    .withApplicationId(applicationId)
    .withName(name)
    .withDescription(description)
    .build();
}

describe('RolesRepository (in-memory db)', () => {
  let dataSource: DataSource;
  let typeormRepository: Repository<RoleEntity>;
  let repository: RolesRepository;

  beforeAll(async () => {
    dataSource = await createInMemoryDataSource([RoleEntity]);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    jest.restoreAllMocks();
    typeormRepository = dataSource.getRepository(RoleEntity);
    await typeormRepository.clear();
    repository = new RolesRepository(typeormRepository);
  });

  describe('createRole', () => {
    it('persists the role and returns it with a generated id', async () => {
      const saved = await repository.createRole(buildRole());

      expect(saved.id).toEqual(expect.any(Number));
      expect(saved).toMatchObject({
        applicationId: 1,
        name: 'ADMIN',
        description: 'Administrator',
      });
      expect(await typeormRepository.count()).toBe(1);
    });

    it('rejects the same name twice in the same application (unique constraint)', async () => {
      await repository.createRole(buildRole(1, 'ADMIN'));

      await expect(
        repository.createRole(buildRole(1, 'ADMIN')),
      ).rejects.toThrow(/duplicate key value violates unique constraint/);
      expect(await typeormRepository.count()).toBe(1);
    });

    it('allows the same name in different applications', async () => {
      await repository.createRole(buildRole(1, 'ADMIN'));
      await repository.createRole(buildRole(2, 'ADMIN'));

      expect(await typeormRepository.count()).toBe(2);
    });

    it('allows different names in the same application', async () => {
      await repository.createRole(buildRole(1, 'ADMIN'));
      await repository.createRole(buildRole(1, 'VIEWER'));

      expect(await typeormRepository.count()).toBe(2);
    });

    it('rejects a name longer than 30 characters', async () => {
      await expect(
        repository.createRole(buildRole(1, 'x'.repeat(31))),
      ).rejects.toThrow();
    });

    it('rejects a description longer than 200 characters', async () => {
      await expect(
        repository.createRole(buildRole(1, 'ADMIN', 'x'.repeat(201))),
      ).rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('returns the role with that id', async () => {
      const saved = await repository.createRole(buildRole());

      await expect(repository.findById(saved.id)).resolves.toMatchObject({
        id: saved.id,
        name: 'ADMIN',
      });
    });

    it('returns null when the id does not exist', async () => {
      await expect(repository.findById(999)).resolves.toBeNull();
    });
  });

  describe('findAllByApplicationId', () => {
    it('returns only the roles of that application', async () => {
      await repository.createRole(buildRole(1, 'ADMIN'));
      await repository.createRole(buildRole(1, 'VIEWER'));
      await repository.createRole(buildRole(2, 'OTHER'));

      const roles = await repository.findAllByApplicationId(1);

      expect(roles.map((role) => role.name).sort()).toEqual([
        'ADMIN',
        'VIEWER',
      ]);
    });

    it('returns an empty list for an application without roles', async () => {
      await expect(repository.findAllByApplicationId(5)).resolves.toEqual([]);
    });
  });

  describe('findByIds', () => {
    it('returns only the roles with the given ids', async () => {
      const a = await repository.createRole(buildRole(1, 'A'));
      await repository.createRole(buildRole(1, 'B'));
      const c = await repository.createRole(buildRole(1, 'C'));

      const found = await repository.findByIds([a.id, c.id]);

      expect(found.map((role) => role.name).sort()).toEqual(['A', 'C']);
    });

    it('ignores ids that do not exist', async () => {
      const a = await repository.createRole(buildRole(1, 'A'));

      await expect(repository.findByIds([a.id, 999])).resolves.toHaveLength(1);
    });

    it('returns an empty list without querying when no ids are given', async () => {
      const findSpy = jest.spyOn(typeormRepository, 'find');

      await expect(repository.findByIds([])).resolves.toEqual([]);

      expect(findSpy).not.toHaveBeenCalled();
    });
  });

  describe('findAllByApplicationIdAndNames', () => {
    it('returns the roles of the application whose name is in the list', async () => {
      await repository.createRole(buildRole(1, 'ADMIN'));
      await repository.createRole(buildRole(1, 'VIEWER'));
      await repository.createRole(buildRole(1, 'EDITOR'));

      const roles = await repository.findAllByApplicationIdAndNames(1, [
        'ADMIN',
        'EDITOR',
      ]);

      expect(roles.map((role) => role.name).sort()).toEqual([
        'ADMIN',
        'EDITOR',
      ]);
    });

    it('does not return roles with the same name from another application', async () => {
      await repository.createRole(buildRole(1, 'ADMIN'));
      await repository.createRole(buildRole(2, 'ADMIN'));

      const roles = await repository.findAllByApplicationIdAndNames(2, [
        'ADMIN',
      ]);

      expect(roles).toHaveLength(1);
      expect(roles[0].applicationId).toBe(2);
    });

    it('ignores names that do not exist', async () => {
      await repository.createRole(buildRole(1, 'ADMIN'));

      const roles = await repository.findAllByApplicationIdAndNames(1, [
        'ADMIN',
        'GHOST',
      ]);

      expect(roles).toHaveLength(1);
    });

    it('returns an empty list without querying when no names are given', async () => {
      const findSpy = jest.spyOn(typeormRepository, 'find');

      await expect(
        repository.findAllByApplicationIdAndNames(1, []),
      ).resolves.toEqual([]);

      expect(findSpy).not.toHaveBeenCalled();
    });
  });
});
