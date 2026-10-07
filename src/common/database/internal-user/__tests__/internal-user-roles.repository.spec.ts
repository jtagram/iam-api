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
import { InternalUserRoleEntity } from '../internal-user-role.entity';
import { InternalUserRolesRepository } from '../internal-user-roles.repository';

function build(
  internalUserId: number,
  applicationId: number,
  roleId: number,
): InternalUserRoleEntity {
  const entity = new InternalUserRoleEntity();
  entity.internalUserId = internalUserId;
  entity.applicationId = applicationId;
  entity.roleId = roleId;
  return entity;
}

describe('InternalUserRolesRepository (in-memory db)', () => {
  let dataSource: DataSource;
  let typeormRepository: Repository<InternalUserRoleEntity>;
  let repository: InternalUserRolesRepository;

  beforeAll(async () => {
    dataSource = await createInMemoryDataSource([InternalUserRoleEntity]);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    jest.restoreAllMocks();
    typeormRepository = dataSource.getRepository(InternalUserRoleEntity);
    await typeormRepository.clear();
    repository = new InternalUserRolesRepository(typeormRepository);
  });

  describe('createAssignment', () => {
    it('persists the assignment and returns it with a generated id', async () => {
      const saved = await repository.createAssignment(build(1, 10, 100));

      expect(saved).toMatchObject({
        id: expect.any(Number),
        internalUserId: 1,
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

  describe('findRoleIdsForInternalUserAndApplication', () => {
    it('returns the role ids of that user in that application', async () => {
      await repository.createAssignment(build(1, 10, 100));
      await repository.createAssignment(build(1, 10, 101));

      const roleIds = await repository.findRoleIdsForInternalUserAndApplication(
        1,
        10,
      );

      expect(roleIds.sort()).toEqual([100, 101]);
    });

    it('does not return roles of another application', async () => {
      await repository.createAssignment(build(1, 10, 100));
      await repository.createAssignment(build(1, 11, 200));

      await expect(
        repository.findRoleIdsForInternalUserAndApplication(1, 10),
      ).resolves.toEqual([100]);
    });

    it('does not return roles of another user', async () => {
      await repository.createAssignment(build(1, 10, 100));
      await repository.createAssignment(build(2, 10, 300));

      await expect(
        repository.findRoleIdsForInternalUserAndApplication(1, 10),
      ).resolves.toEqual([100]);
    });

    it('returns an empty list when there are no roles', async () => {
      await expect(
        repository.findRoleIdsForInternalUserAndApplication(1, 10),
      ).resolves.toEqual([]);
    });
  });

  describe('existsForInternalUserAndRole', () => {
    it('returns true when the user has the role', async () => {
      await repository.createAssignment(build(1, 10, 100));

      await expect(
        repository.existsForInternalUserAndRole(1, 100),
      ).resolves.toBe(true);
    });

    it('returns false for another role of the same user', async () => {
      await repository.createAssignment(build(1, 10, 100));

      await expect(
        repository.existsForInternalUserAndRole(1, 101),
      ).resolves.toBe(false);
    });

    it('returns false for the same role of another user', async () => {
      await repository.createAssignment(build(1, 10, 100));

      await expect(
        repository.existsForInternalUserAndRole(2, 100),
      ).resolves.toBe(false);
    });
  });

  describe('findAllByInternalUserId', () => {
    it('returns only the role assignments of that user', async () => {
      await repository.createAssignment(build(1, 10, 100));
      await repository.createAssignment(build(1, 11, 200));
      await repository.createAssignment(build(2, 10, 300));

      const found = await repository.findAllByInternalUserId(1);

      expect(found.map((row) => row.roleId).sort()).toEqual([100, 200]);
    });

    it('returns an empty list for a user without roles', async () => {
      await expect(repository.findAllByInternalUserId(9)).resolves.toEqual([]);
    });
  });

  describe('findInternalUserIdsByRoleIds', () => {
    it('returns the users holding any of the roles', async () => {
      await repository.createAssignment(build(1, 10, 100));
      await repository.createAssignment(build(2, 10, 101));
      await repository.createAssignment(build(3, 10, 102));

      const ids = await repository.findInternalUserIdsByRoleIds([100, 101]);

      expect(ids.sort()).toEqual([1, 2]);
    });

    it('returns each user once even when it holds several of the roles', async () => {
      await repository.createAssignment(build(1, 10, 100));
      await repository.createAssignment(build(1, 10, 101));

      await expect(
        repository.findInternalUserIdsByRoleIds([100, 101]),
      ).resolves.toEqual([1]);
    });

    it('returns an empty list when nobody holds the roles', async () => {
      await expect(
        repository.findInternalUserIdsByRoleIds([100]),
      ).resolves.toEqual([]);
    });

    it('returns an empty list without querying when no role ids are given', async () => {
      const findSpy = jest.spyOn(typeormRepository, 'find');

      await expect(
        repository.findInternalUserIdsByRoleIds([]),
      ).resolves.toEqual([]);

      expect(findSpy).not.toHaveBeenCalled();
    });
  });
});
