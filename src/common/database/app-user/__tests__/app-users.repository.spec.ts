import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { DataSource, Repository } from 'typeorm';
import { clearAllTables } from '../../../../../test/helpers/clear-tables';
import { ENTITIES } from '../../../../../test/helpers/entities';
import {
	createAppUser,
	connectAppUser,
	createApplication,
	createRole,
	grantAppUserApplication,
	grantAppUserRole,
} from '../../../../../test/helpers/seed';
import { createInMemoryDataSource } from '../../../../../test/helpers/in-memory-db';
import { ApplicationEntity } from '../../application/application.entity';
import { AppUserConnectionEntity } from '../../app-user-connection/app-user-connection.entity';
import { RoleEntity } from '../../role/role.entity';
import { UserAppEntity } from '../../user-application/user-app.entity';
import { UserRoleEntity } from '../../user-role/user-role.entity';
import { AppUserEntity } from '../app-user.entity';
import { AppUsersRepository } from '../app-users.repository';

function buildAssignment(appUserId: number, applicationId: number): UserAppEntity {
	const entity = new UserAppEntity();
	entity.appUserId = appUserId;
	entity.applicationId = applicationId;
	return entity;
}

function buildRoleAssignment(appUserApplicationId: number, roleId: number): UserRoleEntity {
	const entity = new UserRoleEntity();
	entity.appUserApplicationId = appUserApplicationId;
	entity.roleId = roleId;
	return entity;
}

function buildConnection(
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

function buildAppUser(clienteId = 'client-1', overrides: { secret?: string; name?: string } = {}) {
	return AppUserEntity.builder()
		.withClienteId(clienteId)
		.withClienteSecret(overrides.secret ?? 'x'.repeat(60))
		.withName(overrides.name ?? 'Service')
		.withDescription('A service client')
		.build();
}

describe('AppUsersRepository (in-memory db)', () => {
	let dataSource: DataSource;
	let typeormRepository: Repository<AppUserEntity>;
	let repository: AppUsersRepository;

	beforeAll(async () => {
		dataSource = await createInMemoryDataSource(ENTITIES);
	});

	afterAll(async () => {
		await dataSource.destroy();
	});

	beforeEach(async () => {
		jest.restoreAllMocks();
		typeormRepository = dataSource.getRepository(AppUserEntity);
		await clearAllTables(dataSource);
		repository = new AppUsersRepository(typeormRepository);
	});

	describe('createAppUser', () => {
		it('persists the app user and returns it with a generated id', async () => {
			const saved = await repository.createAppUser(buildAppUser());

			expect(saved.id).toEqual(expect.any(Number));
			expect(saved).toMatchObject({ clienteId: 'client-1', name: 'Service' });
			expect(await typeormRepository.count()).toBe(1);
		});

		it('rejects a duplicated clienteId (unique constraint)', async () => {
			await repository.createAppUser(buildAppUser('client-1'));

			await expect(repository.createAppUser(buildAppUser('client-1'))).rejects.toThrow(
				/duplicate key value violates unique constraint/,
			);
			expect(await typeormRepository.count()).toBe(1);
		});

		it('allows two app users with the same name', async () => {
			await repository.createAppUser(buildAppUser('a', { name: 'Same' }));
			await repository.createAppUser(buildAppUser('b', { name: 'Same' }));

			expect(await typeormRepository.count()).toBe(2);
		});

		it('rejects a clienteId longer than 30 characters', async () => {
			await expect(repository.createAppUser(buildAppUser('x'.repeat(31)))).rejects.toThrow();
		});

		it('rejects a clienteSecret longer than 60 characters', async () => {
			await expect(
				repository.createAppUser(buildAppUser('a', { secret: 'x'.repeat(61) })),
			).rejects.toThrow();
		});

		it('rejects a name longer than 30 characters', async () => {
			await expect(
				repository.createAppUser(buildAppUser('a', { name: 'x'.repeat(31) })),
			).rejects.toThrow();
		});
	});

	describe('findByClienteId', () => {
		it('returns the app user with that clienteId', async () => {
			await repository.createAppUser(buildAppUser('a'));
			await repository.createAppUser(buildAppUser('b'));

			await expect(repository.findByClienteId('b')).resolves.toMatchObject({
				clienteId: 'b',
			});
		});

		it('returns null when the clienteId does not exist', async () => {
			await expect(repository.findByClienteId('missing')).resolves.toBeNull();
		});

		it('matches the clienteId case-sensitively', async () => {
			await repository.createAppUser(buildAppUser('Abc'));

			await expect(repository.findByClienteId('abc')).resolves.toBeNull();
		});
	});

	describe('findById', () => {
		it('returns the app user with that id', async () => {
			const saved = await repository.createAppUser(buildAppUser());

			await expect(repository.findById(saved.id)).resolves.toMatchObject({
				id: saved.id,
			});
		});

		it('returns null when the id does not exist', async () => {
			await expect(repository.findById(999)).resolves.toBeNull();
		});
	});

	describe('findByName', () => {
		it('returns the app user with that name', async () => {
			const saved = await repository.createAppUser(buildAppUser('a'));

			await expect(repository.findByName(saved.name)).resolves.toMatchObject({ id: saved.id });
		});

		it('returns null when no app user has that name', async () => {
			await expect(repository.findByName('missing')).resolves.toBeNull();
		});
	});

	describe('findAllOrderedByCreatedAtDesc', () => {
		it('returns an empty list when there are no app users', async () => {
			await expect(repository.findAllOrderedByCreatedAtDesc()).resolves.toEqual([]);
		});

		it('returns every app user, the most recently created first', async () => {
			const first = await repository.createAppUser(buildAppUser('a'));
			const second = await repository.createAppUser(buildAppUser('b'));
			await typeormRepository.update(first.id, { createdAt: new Date('2024-01-01T00:00:00Z') });

			const all = await repository.findAllOrderedByCreatedAtDesc();

			expect(all.map((appUser) => appUser.id)).toEqual([second.id, first.id]);
		});
	});

	describe('findByIdWithAssignments', () => {
		it('loads the assigned applications with the roles that hang off each one', async () => {
			const { entity: user } = await createAppUser(dataSource);
			const appA = await createApplication(dataSource, 'app-a');
			const appB = await createApplication(dataSource, 'app-b');
			const admin = await createRole(dataSource, appB.id, 'ADMIN');
			await grantAppUserApplication(dataSource, user.id, appA.id);
			await grantAppUserRole(dataSource, user.id, admin);

			const found = await repository.findByIdWithAssignments(user.id);

			const tree = found?.applications.map((assignment) => [
				assignment.application.name,
				assignment.roles.map((roleAssignment) => roleAssignment.role.name),
			]);
			expect(tree).toEqual([
				['app-b', ['ADMIN']],
				['app-a', []],
			]);
		});

		it('lists applications, and the roles of each, newest first', async () => {
			const { entity: user } = await createAppUser(dataSource);
			const older = await createApplication(dataSource, 'older');
			const newer = await createApplication(dataSource, 'newer');
			const olderRole = await createRole(dataSource, older.id, 'OLD');
			const newerRole = await createRole(dataSource, older.id, 'NEW');
			await dataSource.getRepository(ApplicationEntity).update(older.id, {
				createdAt: new Date('2024-01-01T00:00:00Z'),
			});
			await dataSource.getRepository(ApplicationEntity).update(newer.id, {
				createdAt: new Date('2024-02-01T00:00:00Z'),
			});
			await dataSource.getRepository(RoleEntity).update(olderRole.id, {
				createdAt: new Date('2024-01-01T00:00:00Z'),
			});
			await dataSource.getRepository(RoleEntity).update(newerRole.id, {
				createdAt: new Date('2024-02-01T00:00:00Z'),
			});
			await grantAppUserApplication(dataSource, user.id, older.id);
			await grantAppUserApplication(dataSource, user.id, newer.id);
			await grantAppUserRole(dataSource, user.id, olderRole);
			await grantAppUserRole(dataSource, user.id, newerRole);

			const found = await repository.findByIdWithAssignments(user.id);

			expect(found?.applications.map((assignment) => assignment.application.name)).toEqual([
				'newer',
				'older',
			]);
			expect(found?.applications[1].roles.map((assignment) => assignment.role.name)).toEqual([
				'NEW',
				'OLD',
			]);
		});

		it('does not load assignments of other users', async () => {
			const { entity: user } = await createAppUser(dataSource);
			const { entity: other } = await createAppUser(dataSource, {
				clienteId: 'client-2',
				name: 'Other',
			});
			const application = await createApplication(dataSource, 'app-a');
			const role = await createRole(dataSource, application.id, 'ADMIN');
			await grantAppUserRole(dataSource, other.id, role);

			const found = await repository.findByIdWithAssignments(user.id);

			expect(found?.applications).toEqual([]);
		});

		it('returns the user without applications when it has no assignments', async () => {
			const { entity: user } = await createAppUser(dataSource);

			await expect(repository.findByIdWithAssignments(user.id)).resolves.toMatchObject({
				id: user.id,
				applications: [],
			});
		});

		it('returns null when the user does not exist', async () => {
			await expect(repository.findByIdWithAssignments(999)).resolves.toBeNull();
		});
	});

	describe('findByIdWithConnections', () => {
		it('loads the connections with their origin and destination applications', async () => {
			const user = (await createAppUser(dataSource)).entity;
			const iam = await createApplication(dataSource, 'iam');
			const hub = await createApplication(dataSource, 'hub');
			await connectAppUser(dataSource, user.id, iam.id, hub.id);

			const found = await repository.findByIdWithConnections(user.id);

			expect(found?.connections).toHaveLength(1);
			expect(found?.connections[0].originApplication.name).toBe('iam');
			expect(found?.connections[0].destinationApplication.name).toBe('hub');
		});

		it('lists the connections newest first', async () => {
			const user = (await createAppUser(dataSource)).entity;
			const iam = await createApplication(dataSource, 'iam');
			const hub = await createApplication(dataSource, 'hub');
			const infra = await createApplication(dataSource, 'infra');
			const crm = await createApplication(dataSource, 'crm');
			const oldest = await connectAppUser(dataSource, user.id, iam.id, hub.id);
			const newest = await connectAppUser(dataSource, user.id, iam.id, infra.id);
			const middle = await connectAppUser(dataSource, user.id, iam.id, crm.id);
			const connections = dataSource.getRepository(AppUserConnectionEntity);
			await connections.update(oldest.id, { createdAt: new Date('2024-01-01T00:00:00Z') });
			await connections.update(middle.id, { createdAt: new Date('2024-02-01T00:00:00Z') });
			await connections.update(newest.id, { createdAt: new Date('2024-03-01T00:00:00Z') });

			const found = await repository.findByIdWithConnections(user.id);

			expect(found?.connections.map((connection) => connection.id)).toEqual([
				newest.id,
				middle.id,
				oldest.id,
			]);
		});

		it('breaks createdAt ties by id, newest first', async () => {
			const user = (await createAppUser(dataSource)).entity;
			const iam = await createApplication(dataSource, 'iam');
			const hub = await createApplication(dataSource, 'hub');
			const infra = await createApplication(dataSource, 'infra');
			const first = await connectAppUser(dataSource, user.id, iam.id, hub.id);
			const second = await connectAppUser(dataSource, user.id, iam.id, infra.id);
			const sameInstant = new Date('2024-01-01T00:00:00Z');
			const connections = dataSource.getRepository(AppUserConnectionEntity);
			await connections.update(first.id, { createdAt: sameInstant });
			await connections.update(second.id, { createdAt: sameInstant });

			const found = await repository.findByIdWithConnections(user.id);

			expect(found?.connections.map((connection) => connection.id)).toEqual([second.id, first.id]);
		});

		it('does not load the connections of other users', async () => {
			const user = (await createAppUser(dataSource)).entity;
			const other = await createAppUser(dataSource, { clienteId: 'other-client', name: 'Other' });
			const iam = await createApplication(dataSource, 'iam');
			const hub = await createApplication(dataSource, 'hub');
			await connectAppUser(dataSource, other.entity.id, iam.id, hub.id);

			const found = await repository.findByIdWithConnections(user.id);

			expect(found?.connections).toEqual([]);
		});

		it('returns the user with an empty list when it has no connections', async () => {
			const user = (await createAppUser(dataSource)).entity;

			await expect(repository.findByIdWithConnections(user.id)).resolves.toMatchObject({
				id: user.id,
				connections: [],
			});
		});

		it('returns null when the user does not exist', async () => {
			await expect(repository.findByIdWithConnections(999)).resolves.toBeNull();
		});
	});

	describe('findByIdWithConnection', () => {
		it('loads only the requested connection, with its applications, when the user has several', async () => {
			const user = (await createAppUser(dataSource)).entity;
			const iam = await createApplication(dataSource, 'iam');
			const hub = await createApplication(dataSource, 'hub');
			const infra = await createApplication(dataSource, 'infra');
			await connectAppUser(dataSource, user.id, iam.id, hub.id);
			const requested = await connectAppUser(dataSource, user.id, iam.id, infra.id);
			await connectAppUser(dataSource, user.id, hub.id, infra.id);

			const found = await repository.findByIdWithConnection(user.id, requested.id);

			expect(found?.id).toBe(user.id);
			expect(found?.connections).toHaveLength(1);
			expect(found?.connections[0].id).toBe(requested.id);
			expect(found?.connections[0].originApplication.name).toBe('iam');
			expect(found?.connections[0].destinationApplication.name).toBe('infra');
		});

		it('returns null when the connection id does not exist for that user', async () => {
			const user = (await createAppUser(dataSource)).entity;
			const iam = await createApplication(dataSource, 'iam');
			const hub = await createApplication(dataSource, 'hub');
			await connectAppUser(dataSource, user.id, iam.id, hub.id);

			await expect(repository.findByIdWithConnection(user.id, 999)).resolves.toBeNull();
		});

		it('returns null when the connection belongs to another user', async () => {
			const user = (await createAppUser(dataSource)).entity;
			const other = await createAppUser(dataSource, { clienteId: 'other-client', name: 'Other' });
			const iam = await createApplication(dataSource, 'iam');
			const hub = await createApplication(dataSource, 'hub');
			const foreign = await connectAppUser(dataSource, other.entity.id, iam.id, hub.id);

			await expect(repository.findByIdWithConnection(user.id, foreign.id)).resolves.toBeNull();
		});
	});

	describe('hasConnection', () => {
		it('returns true when the user has the exact connection', async () => {
			const user = (await createAppUser(dataSource)).entity;
			const iam = await createApplication(dataSource, 'iam');
			const hub = await createApplication(dataSource, 'hub');
			await connectAppUser(dataSource, user.id, iam.id, hub.id);

			await expect(repository.hasConnection(user.id, iam.id, hub.id)).resolves.toBe(true);
		});

		it('returns false for the reversed direction', async () => {
			const user = (await createAppUser(dataSource)).entity;
			const iam = await createApplication(dataSource, 'iam');
			const hub = await createApplication(dataSource, 'hub');
			await connectAppUser(dataSource, user.id, iam.id, hub.id);

			await expect(repository.hasConnection(user.id, hub.id, iam.id)).resolves.toBe(false);
		});

		it('returns false for another destination', async () => {
			const user = (await createAppUser(dataSource)).entity;
			const iam = await createApplication(dataSource, 'iam');
			const hub = await createApplication(dataSource, 'hub');
			const billing = await createApplication(dataSource, 'billing');
			await connectAppUser(dataSource, user.id, iam.id, hub.id);

			await expect(repository.hasConnection(user.id, iam.id, billing.id)).resolves.toBe(false);
		});

		it('returns false for another user', async () => {
			const user = (await createAppUser(dataSource)).entity;
			const other = await createAppUser(dataSource, { clienteId: 'other-client', name: 'Other' });
			const iam = await createApplication(dataSource, 'iam');
			const hub = await createApplication(dataSource, 'hub');
			await connectAppUser(dataSource, user.id, iam.id, hub.id);

			await expect(repository.hasConnection(other.entity.id, iam.id, hub.id)).resolves.toBe(false);
		});

		it('returns false for a user without connections', async () => {
			const user = (await createAppUser(dataSource)).entity;
			const iam = await createApplication(dataSource, 'iam');
			const hub = await createApplication(dataSource, 'hub');

			await expect(repository.hasConnection(user.id, iam.id, hub.id)).resolves.toBe(false);
		});
	});

	describe('findApplicationAssignment', () => {
		it('returns the assignment of that user and application', async () => {
			const user = (await createAppUser(dataSource)).entity;
			const app = await createApplication(dataSource, 'app-a');
			const granted = await grantAppUserApplication(dataSource, user.id, app.id);

			await expect(repository.findApplicationAssignment(user.id, app.id)).resolves.toMatchObject({
				id: granted.id,
				appUserId: user.id,
				applicationId: app.id,
			});
		});

		it('returns null for another application of the same user', async () => {
			const user = (await createAppUser(dataSource)).entity;
			const app = await createApplication(dataSource, 'app-a');
			const other = await createApplication(dataSource, 'app-b');
			await grantAppUserApplication(dataSource, user.id, app.id);

			await expect(repository.findApplicationAssignment(user.id, other.id)).resolves.toBeNull();
		});

		it('returns null for the same application of another user', async () => {
			const user = (await createAppUser(dataSource)).entity;
			const other = (await createAppUser(dataSource, { clienteId: 'client-2', name: 'Other' }))
				.entity;
			const app = await createApplication(dataSource, 'app-a');
			await grantAppUserApplication(dataSource, user.id, app.id);

			await expect(repository.findApplicationAssignment(other.id, app.id)).resolves.toBeNull();
		});
	});

	describe('hasApplication', () => {
		it('returns true when the application is assigned to the user', async () => {
			const user = (await createAppUser(dataSource)).entity;
			const app = await createApplication(dataSource, 'app-a');
			await grantAppUserApplication(dataSource, user.id, app.id);

			await expect(repository.hasApplication(user.id, app.id)).resolves.toBe(true);
		});

		it('returns false for another application of the same user', async () => {
			const user = (await createAppUser(dataSource)).entity;
			const app = await createApplication(dataSource, 'app-a');
			const other = await createApplication(dataSource, 'app-b');
			await grantAppUserApplication(dataSource, user.id, app.id);

			await expect(repository.hasApplication(user.id, other.id)).resolves.toBe(false);
		});

		it('returns false for the same application of another user', async () => {
			const user = (await createAppUser(dataSource)).entity;
			const other = (await createAppUser(dataSource, { clienteId: 'client-2', name: 'Other' }))
				.entity;
			const app = await createApplication(dataSource, 'app-a');
			await grantAppUserApplication(dataSource, user.id, app.id);

			await expect(repository.hasApplication(other.id, app.id)).resolves.toBe(false);
		});
	});

	describe('hasRole', () => {
		it('returns true when the user holds the role', async () => {
			const user = (await createAppUser(dataSource)).entity;
			const app = await createApplication(dataSource, 'app-a');
			const role = await createRole(dataSource, app.id, 'ADMIN');
			await grantAppUserRole(dataSource, user.id, role);

			await expect(repository.hasRole(user.id, role.id)).resolves.toBe(true);
		});

		it('returns false for another role of the same user', async () => {
			const user = (await createAppUser(dataSource)).entity;
			const app = await createApplication(dataSource, 'app-a');
			const role = await createRole(dataSource, app.id, 'ADMIN');
			const other = await createRole(dataSource, app.id, 'VIEWER');
			await grantAppUserRole(dataSource, user.id, role);

			await expect(repository.hasRole(user.id, other.id)).resolves.toBe(false);
		});

		it('returns false for the same role of another user', async () => {
			const user = (await createAppUser(dataSource)).entity;
			const other = (await createAppUser(dataSource, { clienteId: 'client-2', name: 'Other' }))
				.entity;
			const app = await createApplication(dataSource, 'app-a');
			const role = await createRole(dataSource, app.id, 'ADMIN');
			await grantAppUserRole(dataSource, user.id, role);

			await expect(repository.hasRole(other.id, role.id)).resolves.toBe(false);
		});

		it('returns false when the user has the application but no roles', async () => {
			const user = (await createAppUser(dataSource)).entity;
			const app = await createApplication(dataSource, 'app-a');
			const role = await createRole(dataSource, app.id, 'ADMIN');
			await grantAppUserApplication(dataSource, user.id, app.id);

			await expect(repository.hasRole(user.id, role.id)).resolves.toBe(false);
		});
	});

	describe('addApplication', () => {
		it('persists the assignment and returns it with a generated id', async () => {
			const user = (await createAppUser(dataSource)).entity;
			const app = await createApplication(dataSource, 'app-a');

			const saved = await repository.addApplication(buildAssignment(user.id, app.id));

			expect(saved).toMatchObject({
				id: expect.any(Number),
				createdAt: expect.any(Date),
				updatedAt: expect.any(Date),
				appUserId: user.id,
				applicationId: app.id,
			});
			const rows = await dataSource.getRepository(UserAppEntity).find();
			expect(rows).toHaveLength(1);
			expect(rows[0]).toMatchObject({ id: saved.id, appUserId: user.id, applicationId: app.id });
		});

		it('rejects the same user and application twice (unique constraint)', async () => {
			const user = (await createAppUser(dataSource)).entity;
			const app = await createApplication(dataSource, 'app-a');
			await repository.addApplication(buildAssignment(user.id, app.id));

			await expect(repository.addApplication(buildAssignment(user.id, app.id))).rejects.toThrow(
				/duplicate key value violates unique constraint/,
			);
			expect(await dataSource.getRepository(UserAppEntity).count()).toBe(1);
		});

		it('rejects an application that does not exist', async () => {
			const user = (await createAppUser(dataSource)).entity;

			await expect(repository.addApplication(buildAssignment(user.id, 999))).rejects.toThrow();
		});
	});

	describe('addRole', () => {
		it('persists the role under the application assignment and returns it with a generated id', async () => {
			const user = (await createAppUser(dataSource)).entity;
			const app = await createApplication(dataSource, 'app-a');
			const role = await createRole(dataSource, app.id, 'ADMIN');
			const assignment = await grantAppUserApplication(dataSource, user.id, app.id);

			const saved = await repository.addRole(buildRoleAssignment(assignment.id, role.id));

			expect(saved).toMatchObject({
				id: expect.any(Number),
				createdAt: expect.any(Date),
				updatedAt: expect.any(Date),
				appUserApplicationId: assignment.id,
				roleId: role.id,
			});
			const rows = await dataSource.getRepository(UserRoleEntity).find();
			expect(rows).toHaveLength(1);
			expect(rows[0]).toMatchObject({
				id: saved.id,
				appUserApplicationId: assignment.id,
				roleId: role.id,
			});
		});

		it('rejects the same role twice on one application assignment (unique constraint)', async () => {
			const user = (await createAppUser(dataSource)).entity;
			const app = await createApplication(dataSource, 'app-a');
			const role = await createRole(dataSource, app.id, 'ADMIN');
			const assignment = await grantAppUserApplication(dataSource, user.id, app.id);
			await repository.addRole(buildRoleAssignment(assignment.id, role.id));

			await expect(repository.addRole(buildRoleAssignment(assignment.id, role.id))).rejects.toThrow(
				/duplicate key value violates unique constraint/,
			);
			expect(await dataSource.getRepository(UserRoleEntity).count()).toBe(1);
		});

		it('rejects a role for an application assignment that does not exist', async () => {
			const app = await createApplication(dataSource, 'app-a');
			const role = await createRole(dataSource, app.id, 'ADMIN');

			await expect(repository.addRole(buildRoleAssignment(999, role.id))).rejects.toThrow();
		});

		it('deletes the roles when their application assignment is deleted (cascade)', async () => {
			const user = (await createAppUser(dataSource)).entity;
			const other = (await createAppUser(dataSource, { clienteId: 'client-2', name: 'Other' }))
				.entity;
			const app = await createApplication(dataSource, 'app-a');
			const role = await createRole(dataSource, app.id, 'ADMIN');
			const kept = await grantAppUserRole(dataSource, other.id, role);
			const dropped = await grantAppUserRole(dataSource, user.id, role);

			await dataSource.getRepository(UserAppEntity).delete(dropped.appUserApplicationId);

			const remaining = await dataSource.getRepository(UserRoleEntity).find();
			expect(remaining.map((row) => row.id)).toEqual([kept.id]);
		});
	});

	describe('addConnection', () => {
		it('persists the connection and returns it with a generated id', async () => {
			const user = (await createAppUser(dataSource)).entity;
			const iam = await createApplication(dataSource, 'iam');
			const hub = await createApplication(dataSource, 'hub');

			const saved = await repository.addConnection(buildConnection(user.id, iam.id, hub.id));

			expect(saved).toMatchObject({
				id: expect.any(Number),
				createdAt: expect.any(Date),
				updatedAt: expect.any(Date),
				appUserId: user.id,
				originApplicationId: iam.id,
				destinationApplicationId: hub.id,
			});
			const rows = await dataSource.getRepository(AppUserConnectionEntity).find();
			expect(rows).toHaveLength(1);
			expect(rows[0]).toMatchObject({ id: saved.id, appUserId: user.id });
		});

		it('allows several destinations for the same origin', async () => {
			const user = (await createAppUser(dataSource)).entity;
			const iam = await createApplication(dataSource, 'iam');
			const hub = await createApplication(dataSource, 'hub');
			const infra = await createApplication(dataSource, 'infra');
			await repository.addConnection(buildConnection(user.id, iam.id, hub.id));
			await repository.addConnection(buildConnection(user.id, iam.id, infra.id));

			expect(await dataSource.getRepository(AppUserConnectionEntity).count()).toBe(2);
		});

		it('rejects the same user, origin and destination twice (unique constraint)', async () => {
			const user = (await createAppUser(dataSource)).entity;
			const iam = await createApplication(dataSource, 'iam');
			const hub = await createApplication(dataSource, 'hub');
			await repository.addConnection(buildConnection(user.id, iam.id, hub.id));

			await expect(
				repository.addConnection(buildConnection(user.id, iam.id, hub.id)),
			).rejects.toThrow(/duplicate key value violates unique constraint/);
			expect(await dataSource.getRepository(AppUserConnectionEntity).count()).toBe(1);
		});
	});
});
