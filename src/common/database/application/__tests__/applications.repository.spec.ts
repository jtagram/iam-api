import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { DataSource, Repository } from 'typeorm';
import { clearAllTables } from '../../../../../test/helpers/clear-tables';
import { ENTITIES } from '../../../../../test/helpers/entities';
import { createApplication, createRole } from '../../../../../test/helpers/seed';
import { createInMemoryDataSource } from '../../../../../test/helpers/in-memory-db';
import { RoleEntity } from '../../role/role.entity';
import { ApplicationEntity } from '../application.entity';
import { ApplicationsRepository } from '../applications.repository';

function buildApplication(name = 'iam', description = 'Identity and access') {
	return ApplicationEntity.builder().withName(name).withDescription(description).build();
}

describe('ApplicationsRepository (in-memory db)', () => {
	let dataSource: DataSource;
	let typeormRepository: Repository<ApplicationEntity>;
	let repository: ApplicationsRepository;

	beforeAll(async () => {
		dataSource = await createInMemoryDataSource(ENTITIES);
	});

	afterAll(async () => {
		await dataSource.destroy();
	});

	beforeEach(async () => {
		jest.restoreAllMocks();
		typeormRepository = dataSource.getRepository(ApplicationEntity);
		await clearAllTables(dataSource);
		repository = new ApplicationsRepository(typeormRepository);
	});

	describe('createApplication', () => {
		it('persists the application and returns it with a generated id', async () => {
			const saved = await repository.createApplication(buildApplication());

			expect(saved.id).toEqual(expect.any(Number));
			expect(saved).toMatchObject({
				name: 'iam',
				description: 'Identity and access',
			});
			expect(await typeormRepository.count()).toBe(1);
		});

		it('assigns a different id to each application', async () => {
			const first = await repository.createApplication(buildApplication('a'));
			const second = await repository.createApplication(buildApplication('b'));

			expect(second.id).not.toBe(first.id);
		});

		it('rejects a duplicated name (unique constraint)', async () => {
			await repository.createApplication(buildApplication('iam'));

			await expect(repository.createApplication(buildApplication('iam'))).rejects.toThrow(
				/duplicate key value violates unique constraint/,
			);
			expect(await typeormRepository.count()).toBe(1);
		});

		it('rejects a name longer than 30 characters', async () => {
			await expect(
				repository.createApplication(buildApplication('x'.repeat(31))),
			).rejects.toThrow();
			expect(await typeormRepository.count()).toBe(0);
		});

		it('accepts a name of exactly 30 characters', async () => {
			const saved = await repository.createApplication(buildApplication('x'.repeat(30)));

			expect(saved.name).toHaveLength(30);
		});

		it('rejects a description longer than 200 characters', async () => {
			await expect(
				repository.createApplication(buildApplication('iam', 'x'.repeat(201))),
			).rejects.toThrow();
		});
	});

	describe('findById', () => {
		it('returns the application with that id', async () => {
			const saved = await repository.createApplication(buildApplication());

			await expect(repository.findById(saved.id)).resolves.toMatchObject({
				id: saved.id,
				name: 'iam',
			});
		});

		it('returns null when the id does not exist', async () => {
			await expect(repository.findById(999)).resolves.toBeNull();
		});
	});

	describe('findAllOrderedByCreatedAtDesc', () => {
		it('returns every application, the most recently created first', async () => {
			const first = await repository.createApplication(buildApplication('a'));
			const second = await repository.createApplication(buildApplication('b'));
			await typeormRepository.update(first.id, { createdAt: new Date('2024-01-01T00:00:00Z') });

			const all = await repository.findAllOrderedByCreatedAtDesc();

			expect(all.map((application) => application.id)).toEqual([second.id, first.id]);
		});

		it('returns an empty list when there are no applications', async () => {
			await expect(repository.findAllOrderedByCreatedAtDesc()).resolves.toEqual([]);
		});
	});

	describe('findByName', () => {
		it('returns the application with that name', async () => {
			await repository.createApplication(buildApplication('iam'));
			await repository.createApplication(buildApplication('ticket-hub'));

			await expect(repository.findByName('ticket-hub')).resolves.toMatchObject({
				name: 'ticket-hub',
			});
		});

		it('returns null when the name does not exist', async () => {
			await expect(repository.findByName('missing')).resolves.toBeNull();
		});

		it('matches the name case-sensitively', async () => {
			await repository.createApplication(buildApplication('iam'));

			await expect(repository.findByName('IAM')).resolves.toBeNull();
		});
	});

	describe('findByIds', () => {
		it('returns only the applications with the given ids', async () => {
			const a = await repository.createApplication(buildApplication('a'));
			await repository.createApplication(buildApplication('b'));
			const c = await repository.createApplication(buildApplication('c'));

			const found = await repository.findByIds([a.id, c.id]);

			expect(found.map((application) => application.name).sort()).toEqual(['a', 'c']);
		});

		it('ignores ids that do not exist', async () => {
			const a = await repository.createApplication(buildApplication('a'));

			const found = await repository.findByIds([a.id, 999]);

			expect(found).toHaveLength(1);
		});

		it('returns an empty list without querying when no ids are given', async () => {
			const findSpy = jest.spyOn(typeormRepository, 'find');

			await expect(repository.findByIds([])).resolves.toEqual([]);

			expect(findSpy).not.toHaveBeenCalled();
		});
	});

	describe('findAllWithRolesOrderedByCreatedAtDesc', () => {
		it('returns every application with its roles, newest first at both levels', async () => {
			const older = await createApplication(dataSource, 'older');
			const newer = await createApplication(dataSource, 'newer');
			const olderFirstRole = await createRole(dataSource, older.id, 'FIRST');
			const olderSecondRole = await createRole(dataSource, older.id, 'SECOND');
			const newerRole = await createRole(dataSource, newer.id, 'ONLY');
			await typeormRepository.update(older.id, { createdAt: new Date('2024-01-01T00:00:00Z') });
			await typeormRepository.update(newer.id, { createdAt: new Date('2024-02-01T00:00:00Z') });
			const roleRepository = dataSource.getRepository(RoleEntity);
			await roleRepository.update(olderFirstRole.id, {
				createdAt: new Date('2024-01-01T00:00:00Z'),
			});
			await roleRepository.update(olderSecondRole.id, {
				createdAt: new Date('2024-03-01T00:00:00Z'),
			});

			const found = await repository.findAllWithRolesOrderedByCreatedAtDesc();

			expect(found.map((application) => application.id)).toEqual([newer.id, older.id]);
			expect(found[0].roles.map((role) => role.id)).toEqual([newerRole.id]);
			expect(found[1].roles.map((role) => role.id)).toEqual([
				olderSecondRole.id,
				olderFirstRole.id,
			]);
		});

		it('returns an application without roles with an empty roles list', async () => {
			await createApplication(dataSource, 'empty');

			const found = await repository.findAllWithRolesOrderedByCreatedAtDesc();

			expect(found).toHaveLength(1);
			expect(found[0].roles).toEqual([]);
		});

		it('returns an empty list when there are no applications', async () => {
			await expect(repository.findAllWithRolesOrderedByCreatedAtDesc()).resolves.toEqual([]);
		});
	});
});
