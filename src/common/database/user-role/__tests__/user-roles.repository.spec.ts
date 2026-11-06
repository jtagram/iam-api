import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { DataSource, Repository } from 'typeorm';
import { clearAllTables } from '../../../../../test/helpers/clear-tables';
import { ENTITIES } from '../../../../../test/helpers/entities';
import { insertParentRows } from '../../../../../test/helpers/fixtures';
import { createInMemoryDataSource } from '../../../../../test/helpers/in-memory-db';
import { UserRoleEntity } from '../user-role.entity';
import { UserRolesRepository } from '../user-roles.repository';

// Application assignments inserted as parents (id: user, application).
const USER1_APP10 = 1;
const USER1_APP11 = 2;
const USER2_APP10 = 3;

function build(appUserApplicationId: number, roleId: number): UserRoleEntity {
	const entity = new UserRoleEntity();
	entity.appUserApplicationId = appUserApplicationId;
	entity.roleId = roleId;
	return entity;
}

describe('UserRolesRepository (in-memory db)', () => {
	let dataSource: DataSource;
	let typeormRepository: Repository<UserRoleEntity>;
	let repository: UserRolesRepository;

	beforeAll(async () => {
		dataSource = await createInMemoryDataSource(ENTITIES);
	});

	afterAll(async () => {
		await dataSource.destroy();
	});

	beforeEach(async () => {
		jest.restoreAllMocks();
		typeormRepository = dataSource.getRepository(UserRoleEntity);
		await clearAllTables(dataSource);
		await insertParentRows(dataSource, {
			appUsers: [1, 2],
			roles: [
				{ id: 100, applicationId: 10 },
				{ id: 101, applicationId: 10 },
				{ id: 200, applicationId: 11 },
				{ id: 300, applicationId: 10 },
			],
			appUserApplications: [
				{ id: USER1_APP10, appUserId: 1, applicationId: 10 },
				{ id: USER1_APP11, appUserId: 1, applicationId: 11 },
				{ id: USER2_APP10, appUserId: 2, applicationId: 10 },
			],
		});
		repository = new UserRolesRepository(typeormRepository);
	});

	describe('findRoleIdsForAppUserAndApplication', () => {
		it('returns the role ids of that user in that application', async () => {
			await typeormRepository.save(build(USER1_APP10, 100));
			await typeormRepository.save(build(USER1_APP10, 101));

			const roleIds = await repository.findRoleIdsForAppUserAndApplication(1, 10);

			expect(roleIds.sort()).toEqual([100, 101]);
		});

		it('does not return roles of another application', async () => {
			await typeormRepository.save(build(USER1_APP10, 100));
			await typeormRepository.save(build(USER1_APP11, 200));

			await expect(repository.findRoleIdsForAppUserAndApplication(1, 10)).resolves.toEqual([100]);
		});

		it('does not return roles of another user', async () => {
			await typeormRepository.save(build(USER1_APP10, 100));
			await typeormRepository.save(build(USER2_APP10, 300));

			await expect(repository.findRoleIdsForAppUserAndApplication(1, 10)).resolves.toEqual([100]);
		});

		it('returns an empty list when there are no roles', async () => {
			await expect(repository.findRoleIdsForAppUserAndApplication(1, 10)).resolves.toEqual([]);
		});
	});
});
