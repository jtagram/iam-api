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
import { UserRoleEntity } from '../user-role.entity';
import { UserRolesRepository } from '../user-roles.repository';

function build(
  appUserId: number,
  applicationId: number,
  roleId: number,
): UserRoleEntity {
  const entity = new UserRoleEntity();
  entity.appUserId = appUserId;
  entity.applicationId = applicationId;
  entity.roleId = roleId;
  return entity;
}

describe('UserRolesRepository (in-memory db)', () => {
  let dataSource: DataSource;
  let typeormRepository: Repository<UserRoleEntity>;
  let repository: UserRolesRepository;

  beforeAll(async () => {
    dataSource = await createInMemoryDataSource([UserRoleEntity]);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    jest.restoreAllMocks();
    typeormRepository = dataSource.getRepository(UserRoleEntity);
    await typeormRepository.clear();
    repository = new UserRolesRepository(typeormRepository);
  });

  describe('createAssignment', () => {
    it('persists the assignment and returns it with a generated id', async () => {
      const saved = await repository.createAssignment(build(1, 10, 100));

      expect(saved).toMatchObject({
        id: expect.any(Number),
        appUserId: 1,
        applicationId: 10,
        roleId: 100,
      });
      expect(await typeormRepository.count()).toBe(1);
    });

    it('does not enforce uniqueness itself (the service does)', async () => {
      await repository.createAssignment(build(1, 10, 100));
      await repository.createAssignment(build(1, 10, 100));

      expect(await typeormRepository.count()).toBe(2);
    });
  });

  describe('findRoleIdsForAppUserAndApplication', () => {
    it('returns the role ids of that user in that application', async () => {
      await repository.createAssignment(build(1, 10, 100));
      await repository.createAssignment(build(1, 10, 101));

      const roleIds = await repository.findRoleIdsForAppUserAndApplication(
        1,
        10,
      );

      expect(roleIds.sort()).toEqual([100, 101]);
    });

    it('does not return roles of another application', async () => {
      await repository.createAssignment(build(1, 10, 100));
      await repository.createAssignment(build(1, 11, 200));

      await expect(
        repository.findRoleIdsForAppUserAndApplication(1, 10),
      ).resolves.toEqual([100]);
    });

    it('does not return roles of another user', async () => {
      await repository.createAssignment(build(1, 10, 100));
      await repository.createAssignment(build(2, 10, 300));

      await expect(
        repository.findRoleIdsForAppUserAndApplication(1, 10),
      ).resolves.toEqual([100]);
    });

    it('returns an empty list when there are no roles', async () => {
      await expect(
        repository.findRoleIdsForAppUserAndApplication(1, 10),
      ).resolves.toEqual([]);
    });
  });

  describe('existsForAppUserAndRole', () => {
    it('returns true when the user has the role', async () => {
      await repository.createAssignment(build(1, 10, 100));

      await expect(repository.existsForAppUserAndRole(1, 100)).resolves.toBe(
        true,
      );
    });

    it('returns false for another role of the same user', async () => {
      await repository.createAssignment(build(1, 10, 100));

      await expect(repository.existsForAppUserAndRole(1, 101)).resolves.toBe(
        false,
      );
    });

    it('returns false for the same role of another user', async () => {
      await repository.createAssignment(build(1, 10, 100));

      await expect(repository.existsForAppUserAndRole(2, 100)).resolves.toBe(
        false,
      );
    });
  });

  describe('findAllByAppUserId', () => {
    it('returns only the role assignments of that user', async () => {
      await repository.createAssignment(build(1, 10, 100));
      await repository.createAssignment(build(1, 11, 200));
      await repository.createAssignment(build(2, 10, 300));

      const found = await repository.findAllByAppUserId(1);

      expect(found.map((row) => row.roleId).sort()).toEqual([100, 200]);
    });

    it('returns an empty list for a user without roles', async () => {
      await expect(repository.findAllByAppUserId(9)).resolves.toEqual([]);
    });
  });
});
