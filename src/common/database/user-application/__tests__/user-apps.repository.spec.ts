import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { DataSource, Repository } from 'typeorm';
import { clearAllTables } from '../../../../../test/helpers/clear-tables';
import { ENTITIES } from '../../../../../test/helpers/entities';
import { insertParentRows } from '../../../../../test/helpers/fixtures';
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
		dataSource = await createInMemoryDataSource(ENTITIES);
	});

	afterAll(async () => {
		await dataSource.destroy();
	});

	beforeEach(async () => {
		jest.restoreAllMocks();
		typeormRepository = dataSource.getRepository(UserAppEntity);
		await clearAllTables(dataSource);
		await insertParentRows(dataSource, { appUsers: [1, 2], applications: [10, 11, 12] });
		repository = new UserAppsRepository(typeormRepository);
	});

	describe('existsForAppUserAndApplication', () => {
		it('returns true when the pair is assigned', async () => {
			await typeormRepository.save(build(1, 10));

			await expect(repository.existsForAppUserAndApplication(1, 10)).resolves.toBe(true);
		});

		it('returns false for another application of the same user', async () => {
			await typeormRepository.save(build(1, 10));

			await expect(repository.existsForAppUserAndApplication(1, 11)).resolves.toBe(false);
		});

		it('returns false for the same application of another user', async () => {
			await typeormRepository.save(build(1, 10));

			await expect(repository.existsForAppUserAndApplication(2, 10)).resolves.toBe(false);
		});
	});
});
