import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { DataSource, Repository } from 'typeorm';
import { clearAllTables } from '../../../../../test/helpers/clear-tables';
import { ENTITIES } from '../../../../../test/helpers/entities';
import { insertParentRows } from '../../../../../test/helpers/fixtures';
import { createInMemoryDataSource } from '../../../../../test/helpers/in-memory-db';
import { InternalUserRoleEntity } from '../internal-user-role.entity';
import { InternalUserRolesRepository } from '../internal-user-roles.repository';

// Application assignments inserted as parents (id: user, application).
const USER1_APP10 = 1;
const USER1_APP11 = 2;
const USER2_APP10 = 3;
const USER3_APP10 = 4;

function build(internalUserApplicationId: number, roleId: number): InternalUserRoleEntity {
	const entity = new InternalUserRoleEntity();
	entity.internalUserApplicationId = internalUserApplicationId;
	entity.roleId = roleId;
	return entity;
}

describe('InternalUserRolesRepository (in-memory db)', () => {
	let dataSource: DataSource;
	let typeormRepository: Repository<InternalUserRoleEntity>;
	let repository: InternalUserRolesRepository;

	beforeAll(async () => {
		dataSource = await createInMemoryDataSource(ENTITIES);
	});

	afterAll(async () => {
		await dataSource.destroy();
	});

	beforeEach(async () => {
		jest.restoreAllMocks();
		typeormRepository = dataSource.getRepository(InternalUserRoleEntity);
		await clearAllTables(dataSource);
		await insertParentRows(dataSource, {
			internalUsers: [1, 2, 3],
			roles: [
				{ id: 100, applicationId: 10 },
				{ id: 101, applicationId: 10 },
				{ id: 102, applicationId: 10 },
				{ id: 200, applicationId: 11 },
				{ id: 300, applicationId: 10 },
			],
			internalUserApplications: [
				{ id: USER1_APP10, internalUserId: 1, applicationId: 10 },
				{ id: USER1_APP11, internalUserId: 1, applicationId: 11 },
				{ id: USER2_APP10, internalUserId: 2, applicationId: 10 },
				{ id: USER3_APP10, internalUserId: 3, applicationId: 10 },
			],
		});
		repository = new InternalUserRolesRepository(typeormRepository);
	});

	describe('findRoleIdsForInternalUserAndApplication', () => {
		it('returns the role ids of that user in that application', async () => {
			await typeormRepository.save(build(USER1_APP10, 100));
			await typeormRepository.save(build(USER1_APP10, 101));

			const roleIds = await repository.findRoleIdsForInternalUserAndApplication(1, 10);

			expect(roleIds.sort()).toEqual([100, 101]);
		});

		it('does not return roles of another application', async () => {
			await typeormRepository.save(build(USER1_APP10, 100));
			await typeormRepository.save(build(USER1_APP11, 200));

			await expect(repository.findRoleIdsForInternalUserAndApplication(1, 10)).resolves.toEqual([
				100,
			]);
		});

		it('does not return roles of another user', async () => {
			await typeormRepository.save(build(USER1_APP10, 100));
			await typeormRepository.save(build(USER2_APP10, 300));

			await expect(repository.findRoleIdsForInternalUserAndApplication(1, 10)).resolves.toEqual([
				100,
			]);
		});

		it('returns an empty list when there are no roles', async () => {
			await expect(repository.findRoleIdsForInternalUserAndApplication(1, 10)).resolves.toEqual([]);
		});
	});
});
