import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { DataSource, Repository } from 'typeorm';
import { createInMemoryDataSource } from '../../../../../test/helpers/in-memory-db';
import { InternalUserConnectionEntity } from '../internal-user-connection.entity';
import { InternalUserConnectionsRepository } from '../internal-user-connections.repository';

function build(
	internalUserId: number,
	originApplicationId: number,
	destinationApplicationId: number,
): InternalUserConnectionEntity {
	const entity = new InternalUserConnectionEntity();
	entity.internalUserId = internalUserId;
	entity.originApplicationId = originApplicationId;
	entity.destinationApplicationId = destinationApplicationId;
	return entity;
}

describe('InternalUserConnectionsRepository (in-memory db)', () => {
	let dataSource: DataSource;
	let typeormRepository: Repository<InternalUserConnectionEntity>;
	let repository: InternalUserConnectionsRepository;

	beforeAll(async () => {
		dataSource = await createInMemoryDataSource([InternalUserConnectionEntity]);
	});

	afterAll(async () => {
		await dataSource.destroy();
	});

	beforeEach(async () => {
		jest.restoreAllMocks();
		typeormRepository = dataSource.getRepository(InternalUserConnectionEntity);
		await typeormRepository.clear();
		repository = new InternalUserConnectionsRepository(typeormRepository);
	});

	describe('createConnection', () => {
		it('persists the connection and returns it with a generated id', async () => {
			const saved = await repository.createConnection(build(1, 10, 20));

			expect(saved).toMatchObject({
				id: expect.any(Number),
				internalUserId: 1,
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

	describe('existsForInternalUserAndApplications', () => {
		it('returns true when the exact connection exists', async () => {
			await repository.createConnection(build(1, 10, 20));

			await expect(repository.existsForInternalUserAndApplications(1, 10, 20)).resolves.toBe(true);
		});

		it('returns false for the reversed direction', async () => {
			await repository.createConnection(build(1, 10, 20));

			await expect(repository.existsForInternalUserAndApplications(1, 20, 10)).resolves.toBe(false);
		});

		it('returns false for another destination', async () => {
			await repository.createConnection(build(1, 10, 20));

			await expect(repository.existsForInternalUserAndApplications(1, 10, 21)).resolves.toBe(false);
		});

		it('returns false for another user', async () => {
			await repository.createConnection(build(1, 10, 20));

			await expect(repository.existsForInternalUserAndApplications(2, 10, 20)).resolves.toBe(false);
		});
	});

	describe('findAllByInternalUserIdOrderedByCreatedAtDesc', () => {
		it('returns only the connections of that user', async () => {
			await repository.createConnection(build(1, 10, 20));
			await repository.createConnection(build(2, 10, 21));

			const found = await repository.findAllByInternalUserIdOrderedByCreatedAtDesc(1);

			expect(found).toHaveLength(1);
			expect(found[0].destinationApplicationId).toBe(20);
		});

		it('returns the connections most recently created first', async () => {
			const oldest = await repository.createConnection(build(1, 10, 22));
			const newest = await repository.createConnection(build(1, 10, 20));
			const middle = await repository.createConnection(build(1, 10, 21));
			await typeormRepository.update(oldest.id, { createdAt: new Date('2024-01-01T00:00:00Z') });
			await typeormRepository.update(newest.id, { createdAt: new Date('2024-03-01T00:00:00Z') });
			await typeormRepository.update(middle.id, { createdAt: new Date('2024-02-01T00:00:00Z') });

			const found = await repository.findAllByInternalUserIdOrderedByCreatedAtDesc(1);

			expect(found.map((row) => row.id)).toEqual([newest.id, middle.id, oldest.id]);
		});

		it('returns an empty list for a user without connections', async () => {
			await expect(repository.findAllByInternalUserIdOrderedByCreatedAtDesc(9)).resolves.toEqual(
				[],
			);
		});
	});
});
