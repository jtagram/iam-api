import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { DataSource, Repository } from 'typeorm';
import { clearAllTables } from '../../../../../test/helpers/clear-tables';
import { ENTITIES } from '../../../../../test/helpers/entities';
import { insertParentRows } from '../../../../../test/helpers/fixtures';
import { createInMemoryDataSource } from '../../../../../test/helpers/in-memory-db';
import { InternalUserAppEntity } from '../internal-user-app.entity';
import { InternalUserAppsRepository } from '../internal-user-apps.repository';

function build(internalUserId: number, applicationId: number): InternalUserAppEntity {
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
		dataSource = await createInMemoryDataSource(ENTITIES);
	});

	afterAll(async () => {
		await dataSource.destroy();
	});

	beforeEach(async () => {
		jest.restoreAllMocks();
		typeormRepository = dataSource.getRepository(InternalUserAppEntity);
		await clearAllTables(dataSource);
		await insertParentRows(dataSource, { internalUsers: [1, 2], applications: [10, 11, 12] });
		repository = new InternalUserAppsRepository(typeormRepository);
	});

	describe('existsForInternalUserAndApplication', () => {
		it('returns true when the pair is assigned', async () => {
			await typeormRepository.save(build(1, 10));

			await expect(repository.existsForInternalUserAndApplication(1, 10)).resolves.toBe(true);
		});

		it('returns false for another application of the same user', async () => {
			await typeormRepository.save(build(1, 10));

			await expect(repository.existsForInternalUserAndApplication(1, 11)).resolves.toBe(false);
		});

		it('returns false for the same application of another user', async () => {
			await typeormRepository.save(build(1, 10));

			await expect(repository.existsForInternalUserAndApplication(2, 10)).resolves.toBe(false);
		});
	});
});
