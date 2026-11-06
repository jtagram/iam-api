import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { DataSource, Repository } from 'typeorm';
import { clearAllTables } from '../../../../../test/helpers/clear-tables';
import { ENTITIES } from '../../../../../test/helpers/entities';
import {
	connectInternalUser,
	createApplication,
	createInternalUser,
	createRole,
	grantInternalUserApplication,
	grantInternalUserRole,
} from '../../../../../test/helpers/seed';
import { createInMemoryDataSource } from '../../../../../test/helpers/in-memory-db';
import { ApplicationEntity } from '../../application/application.entity';
import { InternalUserConnectionEntity } from '../../internal-user-connection/internal-user-connection.entity';
import { RoleEntity } from '../../role/role.entity';
import { InternalUserAppEntity } from '../internal-user-app.entity';
import { InternalUserRoleEntity } from '../internal-user-role.entity';
import { InternalUserEntity } from '../internal-user.entity';
import { InternalUsersRepository } from '../internal-users.repository';

function buildAssignment(internalUserId: number, applicationId: number): InternalUserAppEntity {
	const entity = new InternalUserAppEntity();
	entity.internalUserId = internalUserId;
	entity.applicationId = applicationId;
	return entity;
}

function buildRoleAssignment(
	internalUserApplicationId: number,
	roleId: number,
): InternalUserRoleEntity {
	const entity = new InternalUserRoleEntity();
	entity.internalUserApplicationId = internalUserApplicationId;
	entity.roleId = roleId;
	return entity;
}

function buildConnection(
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

function buildInternalUser(
	email = 'ada@example.com',
	overrides: { name?: string; password?: string } = {},
) {
	return InternalUserEntity.builder()
		.withName(overrides.name ?? 'Ada')
		.withLastname('Lovelace')
		.withEmail(email)
		.withPassword(overrides.password ?? 'x'.repeat(60))
		.build();
}

describe('InternalUsersRepository (in-memory db)', () => {
	let dataSource: DataSource;
	let typeormRepository: Repository<InternalUserEntity>;
	let repository: InternalUsersRepository;

	beforeAll(async () => {
		dataSource = await createInMemoryDataSource(ENTITIES);
	});

	afterAll(async () => {
		await dataSource.destroy();
	});

	beforeEach(async () => {
		jest.restoreAllMocks();
		typeormRepository = dataSource.getRepository(InternalUserEntity);
		await clearAllTables(dataSource);
		repository = new InternalUsersRepository(typeormRepository);
	});

	describe('createInternalUser', () => {
		it('persists the internal user and returns it with a generated id', async () => {
			const saved = await repository.createInternalUser(buildInternalUser());

			expect(saved.id).toEqual(expect.any(Number));
			expect(saved).toMatchObject({
				name: 'Ada',
				lastname: 'Lovelace',
				email: 'ada@example.com',
			});
			expect(await typeormRepository.count()).toBe(1);
		});

		it('rejects a duplicated email (unique constraint)', async () => {
			await repository.createInternalUser(buildInternalUser('ada@example.com'));

			await expect(
				repository.createInternalUser(buildInternalUser('ada@example.com')),
			).rejects.toThrow(/duplicate key value violates unique constraint/);
			expect(await typeormRepository.count()).toBe(1);
		});

		it('treats emails that differ only in case as different (current behavior)', async () => {
			await repository.createInternalUser(buildInternalUser('ada@example.com'));
			await repository.createInternalUser(buildInternalUser('ADA@example.com'));

			expect(await typeormRepository.count()).toBe(2);
		});

		it('rejects an email longer than 30 characters', async () => {
			const email = `${'x'.repeat(20)}@example.com`;

			await expect(repository.createInternalUser(buildInternalUser(email))).rejects.toThrow();
		});

		it('rejects a password hash longer than 60 characters', async () => {
			await expect(
				repository.createInternalUser(
					buildInternalUser('a@example.com', { password: 'x'.repeat(61) }),
				),
			).rejects.toThrow();
		});

		it('rejects a name longer than 30 characters', async () => {
			await expect(
				repository.createInternalUser(buildInternalUser('a@example.com', { name: 'x'.repeat(31) })),
			).rejects.toThrow();
		});
	});

	describe('findByEmail', () => {
		it('returns the internal user with that email', async () => {
			await repository.createInternalUser(buildInternalUser('a@example.com'));
			await repository.createInternalUser(buildInternalUser('b@example.com'));

			await expect(repository.findByEmail('b@example.com')).resolves.toMatchObject({
				email: 'b@example.com',
			});
		});

		it('returns null when the email does not exist', async () => {
			await expect(repository.findByEmail('none@example.com')).resolves.toBeNull();
		});
	});

	describe('findById', () => {
		it('returns the internal user with that id', async () => {
			const saved = await repository.createInternalUser(buildInternalUser());

			await expect(repository.findById(saved.id)).resolves.toMatchObject({
				id: saved.id,
			});
		});

		it('returns null when the id does not exist', async () => {
			await expect(repository.findById(999)).resolves.toBeNull();
		});
	});

	describe('findAllOrderedByCreatedAtDesc', () => {
		it('returns an empty list when there are no internal users', async () => {
			await expect(repository.findAllOrderedByCreatedAtDesc()).resolves.toEqual([]);
		});

		it('returns every internal user, the most recently created first', async () => {
			const first = await repository.createInternalUser(buildInternalUser('a@example.com'));
			const second = await repository.createInternalUser(buildInternalUser('b@example.com'));
			await typeormRepository.update(first.id, { createdAt: new Date('2024-01-01T00:00:00Z') });

			const all = await repository.findAllOrderedByCreatedAtDesc();

			expect(all.map((user) => user.id)).toEqual([second.id, first.id]);
		});
	});

	describe('findByIdWithAssignments', () => {
		it('loads the assigned applications with the roles that hang off each one', async () => {
			const user = await createInternalUser(dataSource, { email: 'ada@example.com' });
			const appA = await createApplication(dataSource, 'app-a');
			const appB = await createApplication(dataSource, 'app-b');
			const admin = await createRole(dataSource, appB.id, 'ADMIN');
			await grantInternalUserApplication(dataSource, user.id, appA.id);
			await grantInternalUserRole(dataSource, user.id, admin);

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
			const user = await createInternalUser(dataSource, { email: 'ada@example.com' });
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
			await grantInternalUserApplication(dataSource, user.id, older.id);
			await grantInternalUserApplication(dataSource, user.id, newer.id);
			await grantInternalUserRole(dataSource, user.id, olderRole);
			await grantInternalUserRole(dataSource, user.id, newerRole);

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
			const user = await createInternalUser(dataSource, { email: 'ada@example.com' });
			const other = await createInternalUser(dataSource, { email: 'bob@example.com' });
			const application = await createApplication(dataSource, 'app-a');
			const role = await createRole(dataSource, application.id, 'ADMIN');
			await grantInternalUserRole(dataSource, other.id, role);

			const found = await repository.findByIdWithAssignments(user.id);

			expect(found?.applications).toEqual([]);
		});

		it('returns the user without applications when it has no assignments', async () => {
			const user = await createInternalUser(dataSource, { email: 'ada@example.com' });

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
			const user = await createInternalUser(dataSource, { email: 'ada@example.com' });
			const iam = await createApplication(dataSource, 'iam');
			const hub = await createApplication(dataSource, 'hub');
			await connectInternalUser(dataSource, user.id, iam.id, hub.id);

			const found = await repository.findByIdWithConnections(user.id);

			expect(found?.connections).toHaveLength(1);
			expect(found?.connections[0].originApplication.name).toBe('iam');
			expect(found?.connections[0].destinationApplication.name).toBe('hub');
		});

		it('lists the connections newest first', async () => {
			const user = await createInternalUser(dataSource, { email: 'ada@example.com' });
			const iam = await createApplication(dataSource, 'iam');
			const hub = await createApplication(dataSource, 'hub');
			const infra = await createApplication(dataSource, 'infra');
			const crm = await createApplication(dataSource, 'crm');
			const oldest = await connectInternalUser(dataSource, user.id, iam.id, hub.id);
			const newest = await connectInternalUser(dataSource, user.id, iam.id, infra.id);
			const middle = await connectInternalUser(dataSource, user.id, iam.id, crm.id);
			const connections = dataSource.getRepository(InternalUserConnectionEntity);
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
			const user = await createInternalUser(dataSource, { email: 'ada@example.com' });
			const iam = await createApplication(dataSource, 'iam');
			const hub = await createApplication(dataSource, 'hub');
			const infra = await createApplication(dataSource, 'infra');
			const first = await connectInternalUser(dataSource, user.id, iam.id, hub.id);
			const second = await connectInternalUser(dataSource, user.id, iam.id, infra.id);
			const sameInstant = new Date('2024-01-01T00:00:00Z');
			const connections = dataSource.getRepository(InternalUserConnectionEntity);
			await connections.update(first.id, { createdAt: sameInstant });
			await connections.update(second.id, { createdAt: sameInstant });

			const found = await repository.findByIdWithConnections(user.id);

			expect(found?.connections.map((connection) => connection.id)).toEqual([second.id, first.id]);
		});

		it('does not load the connections of other users', async () => {
			const user = await createInternalUser(dataSource, { email: 'ada@example.com' });
			const other = await createInternalUser(dataSource, { email: 'bob@example.com' });
			const iam = await createApplication(dataSource, 'iam');
			const hub = await createApplication(dataSource, 'hub');
			await connectInternalUser(dataSource, other.id, iam.id, hub.id);

			const found = await repository.findByIdWithConnections(user.id);

			expect(found?.connections).toEqual([]);
		});

		it('returns the user with an empty list when it has no connections', async () => {
			const user = await createInternalUser(dataSource, { email: 'ada@example.com' });

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
			const user = await createInternalUser(dataSource, { email: 'ada@example.com' });
			const iam = await createApplication(dataSource, 'iam');
			const hub = await createApplication(dataSource, 'hub');
			const infra = await createApplication(dataSource, 'infra');
			await connectInternalUser(dataSource, user.id, iam.id, hub.id);
			const requested = await connectInternalUser(dataSource, user.id, iam.id, infra.id);
			await connectInternalUser(dataSource, user.id, hub.id, infra.id);

			const found = await repository.findByIdWithConnection(user.id, requested.id);

			expect(found?.id).toBe(user.id);
			expect(found?.connections).toHaveLength(1);
			expect(found?.connections[0].id).toBe(requested.id);
			expect(found?.connections[0].originApplication.name).toBe('iam');
			expect(found?.connections[0].destinationApplication.name).toBe('infra');
		});

		it('returns null when the connection id does not exist for that user', async () => {
			const user = await createInternalUser(dataSource, { email: 'ada@example.com' });
			const iam = await createApplication(dataSource, 'iam');
			const hub = await createApplication(dataSource, 'hub');
			await connectInternalUser(dataSource, user.id, iam.id, hub.id);

			await expect(repository.findByIdWithConnection(user.id, 999)).resolves.toBeNull();
		});

		it('returns null when the connection belongs to another user', async () => {
			const user = await createInternalUser(dataSource, { email: 'ada@example.com' });
			const other = await createInternalUser(dataSource, { email: 'other@example.com' });
			const iam = await createApplication(dataSource, 'iam');
			const hub = await createApplication(dataSource, 'hub');
			const foreign = await connectInternalUser(dataSource, other.id, iam.id, hub.id);

			await expect(repository.findByIdWithConnection(user.id, foreign.id)).resolves.toBeNull();
		});
	});

	describe('hasConnection', () => {
		it('returns true when the user has the exact connection', async () => {
			const user = await createInternalUser(dataSource, { email: 'ada@example.com' });
			const iam = await createApplication(dataSource, 'iam');
			const hub = await createApplication(dataSource, 'hub');
			await connectInternalUser(dataSource, user.id, iam.id, hub.id);

			await expect(repository.hasConnection(user.id, iam.id, hub.id)).resolves.toBe(true);
		});

		it('returns false for the reversed direction', async () => {
			const user = await createInternalUser(dataSource, { email: 'ada@example.com' });
			const iam = await createApplication(dataSource, 'iam');
			const hub = await createApplication(dataSource, 'hub');
			await connectInternalUser(dataSource, user.id, iam.id, hub.id);

			await expect(repository.hasConnection(user.id, hub.id, iam.id)).resolves.toBe(false);
		});

		it('returns false for another destination', async () => {
			const user = await createInternalUser(dataSource, { email: 'ada@example.com' });
			const iam = await createApplication(dataSource, 'iam');
			const hub = await createApplication(dataSource, 'hub');
			const billing = await createApplication(dataSource, 'billing');
			await connectInternalUser(dataSource, user.id, iam.id, hub.id);

			await expect(repository.hasConnection(user.id, iam.id, billing.id)).resolves.toBe(false);
		});

		it('returns false for another user', async () => {
			const user = await createInternalUser(dataSource, { email: 'ada@example.com' });
			const other = await createInternalUser(dataSource, { email: 'other@example.com' });
			const iam = await createApplication(dataSource, 'iam');
			const hub = await createApplication(dataSource, 'hub');
			await connectInternalUser(dataSource, user.id, iam.id, hub.id);

			await expect(repository.hasConnection(other.id, iam.id, hub.id)).resolves.toBe(false);
		});

		it('returns false for a user without connections', async () => {
			const user = await createInternalUser(dataSource, { email: 'ada@example.com' });
			const iam = await createApplication(dataSource, 'iam');
			const hub = await createApplication(dataSource, 'hub');

			await expect(repository.hasConnection(user.id, iam.id, hub.id)).resolves.toBe(false);
		});
	});

	describe('findAllWithApplicationsOrderedByCreatedAtDesc', () => {
		it('returns every user with its assignment tree, the most recently created first', async () => {
			const first = await createInternalUser(dataSource, { email: 'a@example.com' });
			const second = await createInternalUser(dataSource, { email: 'b@example.com' });
			const application = await createApplication(dataSource, 'app-a');
			const role = await createRole(dataSource, application.id, 'ADMIN');
			await grantInternalUserRole(dataSource, first.id, role);
			await typeormRepository.update(first.id, { createdAt: new Date('2024-01-01T00:00:00Z') });
			await typeormRepository.update(second.id, { createdAt: new Date('2024-02-01T00:00:00Z') });

			const found = await repository.findAllWithApplicationsOrderedByCreatedAtDesc();

			expect(found.map((user) => user.id)).toEqual([second.id, first.id]);
			expect(found[0].applications).toEqual([]);
			expect(found[1].applications[0].application.name).toBe('app-a');
			expect(found[1].applications[0].roles[0].role.name).toBe('ADMIN');
		});

		it('keeps each user with only its own applications and roles', async () => {
			const first = await createInternalUser(dataSource, { email: 'a@example.com' });
			const second = await createInternalUser(dataSource, { email: 'b@example.com' });
			const application = await createApplication(dataSource, 'app-a');
			const admin = await createRole(dataSource, application.id, 'ADMIN');
			const editor = await createRole(dataSource, application.id, 'EDITOR');
			await grantInternalUserRole(dataSource, first.id, admin);
			await grantInternalUserRole(dataSource, second.id, editor);

			const found = await repository.findAllWithApplicationsOrderedByCreatedAtDesc();

			const rolesByUser = new Map(
				found.map((user) => [
					user.id,
					user.applications.flatMap((assignment) =>
						assignment.roles.map((roleAssignment) => roleAssignment.role.name),
					),
				]),
			);
			expect(rolesByUser.get(first.id)).toEqual(['ADMIN']);
			expect(rolesByUser.get(second.id)).toEqual(['EDITOR']);
		});

		it('returns an empty list when there are no users', async () => {
			await expect(repository.findAllWithApplicationsOrderedByCreatedAtDesc()).resolves.toEqual([]);
		});
	});

	describe('findApplicationAssignment', () => {
		it('returns the assignment of that user and application', async () => {
			const user = await createInternalUser(dataSource, { email: 'ada@example.com' });
			const app = await createApplication(dataSource, 'app-a');
			const granted = await grantInternalUserApplication(dataSource, user.id, app.id);

			await expect(repository.findApplicationAssignment(user.id, app.id)).resolves.toMatchObject({
				id: granted.id,
				internalUserId: user.id,
				applicationId: app.id,
			});
		});

		it('returns null for another application of the same user', async () => {
			const user = await createInternalUser(dataSource, { email: 'ada@example.com' });
			const app = await createApplication(dataSource, 'app-a');
			const other = await createApplication(dataSource, 'app-b');
			await grantInternalUserApplication(dataSource, user.id, app.id);

			await expect(repository.findApplicationAssignment(user.id, other.id)).resolves.toBeNull();
		});

		it('returns null for the same application of another user', async () => {
			const user = await createInternalUser(dataSource, { email: 'ada@example.com' });
			const other = await createInternalUser(dataSource, { email: 'bob@example.com' });
			const app = await createApplication(dataSource, 'app-a');
			await grantInternalUserApplication(dataSource, user.id, app.id);

			await expect(repository.findApplicationAssignment(other.id, app.id)).resolves.toBeNull();
		});
	});

	describe('hasApplication', () => {
		it('returns true when the application is assigned to the user', async () => {
			const user = await createInternalUser(dataSource, { email: 'ada@example.com' });
			const app = await createApplication(dataSource, 'app-a');
			await grantInternalUserApplication(dataSource, user.id, app.id);

			await expect(repository.hasApplication(user.id, app.id)).resolves.toBe(true);
		});

		it('returns false for another application of the same user', async () => {
			const user = await createInternalUser(dataSource, { email: 'ada@example.com' });
			const app = await createApplication(dataSource, 'app-a');
			const other = await createApplication(dataSource, 'app-b');
			await grantInternalUserApplication(dataSource, user.id, app.id);

			await expect(repository.hasApplication(user.id, other.id)).resolves.toBe(false);
		});

		it('returns false for the same application of another user', async () => {
			const user = await createInternalUser(dataSource, { email: 'ada@example.com' });
			const other = await createInternalUser(dataSource, { email: 'bob@example.com' });
			const app = await createApplication(dataSource, 'app-a');
			await grantInternalUserApplication(dataSource, user.id, app.id);

			await expect(repository.hasApplication(other.id, app.id)).resolves.toBe(false);
		});
	});

	describe('hasRole', () => {
		it('returns true when the user holds the role', async () => {
			const user = await createInternalUser(dataSource, { email: 'ada@example.com' });
			const app = await createApplication(dataSource, 'app-a');
			const role = await createRole(dataSource, app.id, 'ADMIN');
			await grantInternalUserRole(dataSource, user.id, role);

			await expect(repository.hasRole(user.id, role.id)).resolves.toBe(true);
		});

		it('returns false for another role of the same user', async () => {
			const user = await createInternalUser(dataSource, { email: 'ada@example.com' });
			const app = await createApplication(dataSource, 'app-a');
			const role = await createRole(dataSource, app.id, 'ADMIN');
			const other = await createRole(dataSource, app.id, 'VIEWER');
			await grantInternalUserRole(dataSource, user.id, role);

			await expect(repository.hasRole(user.id, other.id)).resolves.toBe(false);
		});

		it('returns false for the same role of another user', async () => {
			const user = await createInternalUser(dataSource, { email: 'ada@example.com' });
			const other = await createInternalUser(dataSource, { email: 'bob@example.com' });
			const app = await createApplication(dataSource, 'app-a');
			const role = await createRole(dataSource, app.id, 'ADMIN');
			await grantInternalUserRole(dataSource, user.id, role);

			await expect(repository.hasRole(other.id, role.id)).resolves.toBe(false);
		});

		it('returns false when the user has the application but no roles', async () => {
			const user = await createInternalUser(dataSource, { email: 'ada@example.com' });
			const app = await createApplication(dataSource, 'app-a');
			const role = await createRole(dataSource, app.id, 'ADMIN');
			await grantInternalUserApplication(dataSource, user.id, app.id);

			await expect(repository.hasRole(user.id, role.id)).resolves.toBe(false);
		});
	});

	describe('addApplication', () => {
		it('persists the assignment and returns it with a generated id', async () => {
			const user = await createInternalUser(dataSource, { email: 'ada@example.com' });
			const app = await createApplication(dataSource, 'app-a');

			const saved = await repository.addApplication(buildAssignment(user.id, app.id));

			expect(saved).toMatchObject({
				id: expect.any(Number),
				createdAt: expect.any(Date),
				updatedAt: expect.any(Date),
				internalUserId: user.id,
				applicationId: app.id,
			});
			const rows = await dataSource.getRepository(InternalUserAppEntity).find();
			expect(rows).toHaveLength(1);
			expect(rows[0]).toMatchObject({
				id: saved.id,
				internalUserId: user.id,
				applicationId: app.id,
			});
		});

		it('rejects the same user and application twice (unique constraint)', async () => {
			const user = await createInternalUser(dataSource, { email: 'ada@example.com' });
			const app = await createApplication(dataSource, 'app-a');
			await repository.addApplication(buildAssignment(user.id, app.id));

			await expect(repository.addApplication(buildAssignment(user.id, app.id))).rejects.toThrow(
				/duplicate key value violates unique constraint/,
			);
			expect(await dataSource.getRepository(InternalUserAppEntity).count()).toBe(1);
		});

		it('rejects an application that does not exist', async () => {
			const user = await createInternalUser(dataSource, { email: 'ada@example.com' });

			await expect(repository.addApplication(buildAssignment(user.id, 999))).rejects.toThrow();
		});
	});

	describe('addRole', () => {
		it('persists the role under the application assignment and returns it with a generated id', async () => {
			const user = await createInternalUser(dataSource, { email: 'ada@example.com' });
			const app = await createApplication(dataSource, 'app-a');
			const role = await createRole(dataSource, app.id, 'ADMIN');
			const assignment = await grantInternalUserApplication(dataSource, user.id, app.id);

			const saved = await repository.addRole(buildRoleAssignment(assignment.id, role.id));

			expect(saved).toMatchObject({
				id: expect.any(Number),
				createdAt: expect.any(Date),
				updatedAt: expect.any(Date),
				internalUserApplicationId: assignment.id,
				roleId: role.id,
			});
			const rows = await dataSource.getRepository(InternalUserRoleEntity).find();
			expect(rows).toHaveLength(1);
			expect(rows[0]).toMatchObject({
				id: saved.id,
				internalUserApplicationId: assignment.id,
				roleId: role.id,
			});
		});

		it('rejects the same role twice on one application assignment (unique constraint)', async () => {
			const user = await createInternalUser(dataSource, { email: 'ada@example.com' });
			const app = await createApplication(dataSource, 'app-a');
			const role = await createRole(dataSource, app.id, 'ADMIN');
			const assignment = await grantInternalUserApplication(dataSource, user.id, app.id);
			await repository.addRole(buildRoleAssignment(assignment.id, role.id));

			await expect(repository.addRole(buildRoleAssignment(assignment.id, role.id))).rejects.toThrow(
				/duplicate key value violates unique constraint/,
			);
			expect(await dataSource.getRepository(InternalUserRoleEntity).count()).toBe(1);
		});

		it('rejects a role for an application assignment that does not exist', async () => {
			const app = await createApplication(dataSource, 'app-a');
			const role = await createRole(dataSource, app.id, 'ADMIN');

			await expect(repository.addRole(buildRoleAssignment(999, role.id))).rejects.toThrow();
		});

		it('deletes the roles when their application assignment is deleted (cascade)', async () => {
			const user = await createInternalUser(dataSource, { email: 'ada@example.com' });
			const other = await createInternalUser(dataSource, { email: 'bob@example.com' });
			const app = await createApplication(dataSource, 'app-a');
			const role = await createRole(dataSource, app.id, 'ADMIN');
			const kept = await grantInternalUserRole(dataSource, other.id, role);
			const dropped = await grantInternalUserRole(dataSource, user.id, role);

			await dataSource
				.getRepository(InternalUserAppEntity)
				.delete(dropped.internalUserApplicationId);

			const remaining = await dataSource.getRepository(InternalUserRoleEntity).find();
			expect(remaining.map((row) => row.id)).toEqual([kept.id]);
		});
	});

	describe('addConnection', () => {
		it('persists the connection and returns it with a generated id', async () => {
			const user = await createInternalUser(dataSource, { email: 'ada@example.com' });
			const iam = await createApplication(dataSource, 'iam');
			const hub = await createApplication(dataSource, 'hub');

			const saved = await repository.addConnection(buildConnection(user.id, iam.id, hub.id));

			expect(saved).toMatchObject({
				id: expect.any(Number),
				createdAt: expect.any(Date),
				updatedAt: expect.any(Date),
				internalUserId: user.id,
				originApplicationId: iam.id,
				destinationApplicationId: hub.id,
			});
			const rows = await dataSource.getRepository(InternalUserConnectionEntity).find();
			expect(rows).toHaveLength(1);
			expect(rows[0]).toMatchObject({ id: saved.id, internalUserId: user.id });
		});

		it('allows several destinations for the same origin', async () => {
			const user = await createInternalUser(dataSource, { email: 'ada@example.com' });
			const iam = await createApplication(dataSource, 'iam');
			const hub = await createApplication(dataSource, 'hub');
			const infra = await createApplication(dataSource, 'infra');
			await repository.addConnection(buildConnection(user.id, iam.id, hub.id));
			await repository.addConnection(buildConnection(user.id, iam.id, infra.id));

			expect(await dataSource.getRepository(InternalUserConnectionEntity).count()).toBe(2);
		});

		it('rejects the same user, origin and destination twice (unique constraint)', async () => {
			const user = await createInternalUser(dataSource, { email: 'ada@example.com' });
			const iam = await createApplication(dataSource, 'iam');
			const hub = await createApplication(dataSource, 'hub');
			await repository.addConnection(buildConnection(user.id, iam.id, hub.id));

			await expect(
				repository.addConnection(buildConnection(user.id, iam.id, hub.id)),
			).rejects.toThrow(/duplicate key value violates unique constraint/);
			expect(await dataSource.getRepository(InternalUserConnectionEntity).count()).toBe(1);
		});
	});

	describe('findByApplicationAndRoleNames', () => {
		it('returns the users holding any of the roles in the application', async () => {
			const ada = await createInternalUser(dataSource, { email: 'ada@example.com' });
			const bob = await createInternalUser(dataSource, { email: 'bob@example.com' });
			const eve = await createInternalUser(dataSource, { email: 'eve@example.com' });
			const app = await createApplication(dataSource, 'app-a');
			const admin = await createRole(dataSource, app.id, 'ADMIN');
			const approver = await createRole(dataSource, app.id, 'APPROVER');
			const viewer = await createRole(dataSource, app.id, 'VIEWER');
			await grantInternalUserRole(dataSource, ada.id, admin);
			await grantInternalUserRole(dataSource, bob.id, approver);
			await grantInternalUserRole(dataSource, eve.id, viewer);

			const found = await repository.findByApplicationAndRoleNames('app-a', ['ADMIN', 'APPROVER']);

			expect(found.map((user) => user.id).sort()).toEqual([ada.id, bob.id].sort());
		});

		it('returns each user once even when it holds several of the roles', async () => {
			const ada = await createInternalUser(dataSource, { email: 'ada@example.com' });
			const app = await createApplication(dataSource, 'app-a');
			const admin = await createRole(dataSource, app.id, 'ADMIN');
			const approver = await createRole(dataSource, app.id, 'APPROVER');
			await grantInternalUserRole(dataSource, ada.id, admin);
			await grantInternalUserRole(dataSource, ada.id, approver);

			const found = await repository.findByApplicationAndRoleNames('app-a', ['ADMIN', 'APPROVER']);

			expect(found.map((user) => user.id)).toEqual([ada.id]);
		});

		it('does not match a role of another application with the same name', async () => {
			const ada = await createInternalUser(dataSource, { email: 'ada@example.com' });
			const appA = await createApplication(dataSource, 'app-a');
			const appB = await createApplication(dataSource, 'app-b');
			await createRole(dataSource, appA.id, 'ADMIN');
			const adminB = await createRole(dataSource, appB.id, 'ADMIN');
			await grantInternalUserRole(dataSource, ada.id, adminB);

			await expect(repository.findByApplicationAndRoleNames('app-a', ['ADMIN'])).resolves.toEqual(
				[],
			);
		});

		it('returns an empty list for an unknown application', async () => {
			const ada = await createInternalUser(dataSource, { email: 'ada@example.com' });
			const app = await createApplication(dataSource, 'app-a');
			const admin = await createRole(dataSource, app.id, 'ADMIN');
			await grantInternalUserRole(dataSource, ada.id, admin);

			await expect(repository.findByApplicationAndRoleNames('ghost', ['ADMIN'])).resolves.toEqual(
				[],
			);
		});

		it('returns an empty list when nobody holds the roles', async () => {
			const app = await createApplication(dataSource, 'app-a');
			await createRole(dataSource, app.id, 'ADMIN');

			await expect(repository.findByApplicationAndRoleNames('app-a', ['ADMIN'])).resolves.toEqual(
				[],
			);
		});

		it('returns an empty list without querying when no role names are given', async () => {
			const findSpy = jest.spyOn(typeormRepository, 'find');

			await expect(repository.findByApplicationAndRoleNames('app-a', [])).resolves.toEqual([]);

			expect(findSpy).not.toHaveBeenCalled();
		});

		it('returns the users newest first', async () => {
			const first = await createInternalUser(dataSource, { email: 'first@example.com' });
			const second = await createInternalUser(dataSource, { email: 'second@example.com' });
			const app = await createApplication(dataSource, 'app-a');
			const admin = await createRole(dataSource, app.id, 'ADMIN');
			await grantInternalUserRole(dataSource, first.id, admin);
			await grantInternalUserRole(dataSource, second.id, admin);
			await typeormRepository.update(first.id, { createdAt: new Date('2024-01-01T00:00:00Z') });
			await typeormRepository.update(second.id, { createdAt: new Date('2025-01-01T00:00:00Z') });

			const found = await repository.findByApplicationAndRoleNames('app-a', ['ADMIN']);

			expect(found.map((user) => user.id)).toEqual([second.id, first.id]);
		});

		it('does not load the assignments', async () => {
			const ada = await createInternalUser(dataSource, { email: 'ada@example.com' });
			const app = await createApplication(dataSource, 'app-a');
			const admin = await createRole(dataSource, app.id, 'ADMIN');
			await grantInternalUserRole(dataSource, ada.id, admin);

			const [found] = await repository.findByApplicationAndRoleNames('app-a', ['ADMIN']);

			expect(found.applications).toBeUndefined();
		});
	});
});
