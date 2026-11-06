import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { DataSource, EntityMetadata } from 'typeorm';
import { ENTITIES } from '../../../../test/helpers/entities';
import { createInMemoryDataSource } from '../../../../test/helpers/in-memory-db';
import { AppUserConnectionEntity } from '../app-user-connection/app-user-connection.entity';
import { AppUserEntity } from '../app-user/app-user.entity';
import { ApplicationEntity } from '../application/application.entity';
import { InternalUserConnectionEntity } from '../internal-user-connection/internal-user-connection.entity';
import { InternalUserAppEntity } from '../internal-user/internal-user-app.entity';
import { InternalUserRoleEntity } from '../internal-user/internal-user-role.entity';
import { InternalUserEntity } from '../internal-user/internal-user.entity';
import { RoleEntity } from '../role/role.entity';
import { UserAppEntity } from '../user-application/user-app.entity';
import { UserRoleEntity } from '../user-role/user-role.entity';

type EntityClass = (typeof ENTITIES)[number];

describe('entity metadata', () => {
	let dataSource: DataSource;

	const metadataOf = (entity: EntityClass): EntityMetadata => dataSource.getMetadata(entity);

	const relation = (entity: EntityClass, propertyName: string) => {
		const found = metadataOf(entity).findRelationWithPropertyPath(propertyName);
		if (!found) {
			throw new Error(`${metadataOf(entity).name}.${propertyName} is not a relation`);
		}
		return found;
	};

	beforeAll(async () => {
		dataSource = await createInMemoryDataSource(ENTITIES);
	});

	afterAll(async () => {
		await dataSource.destroy();
	});

	describe('timestamps', () => {
		it.each(ENTITIES.map((entity) => [entity.name, entity] as const))(
			'%s maps created_at and updated_at',
			(_name, entity) => {
				const metadata = metadataOf(entity);

				expect(metadata.createDateColumn?.databaseName).toBe('created_at');
				expect(metadata.updateDateColumn?.databaseName).toBe('updated_at');
			},
		);

		it('covers every table of the schema', () => {
			expect(ENTITIES.map((entity) => metadataOf(entity).tableName).sort()).toEqual([
				'apps_applications',
				'apps_roles',
				'apps_users',
				'apps_users_applications',
				'apps_users_connections',
				'apps_users_roles',
				'internal_users',
				'internal_users_applications',
				'internal_users_connections',
				'internal_users_roles',
			]);
		});
	});

	describe('inverse (one-to-many) sides', () => {
		const cases: [EntityClass, string, EntityClass, string][] = [
			[ApplicationEntity, 'roles', RoleEntity, 'application'],
			[ApplicationEntity, 'appsUsers', UserAppEntity, 'application'],
			[ApplicationEntity, 'internalUsers', InternalUserAppEntity, 'application'],
			[AppUserEntity, 'applications', UserAppEntity, 'appUser'],
			[UserAppEntity, 'roles', UserRoleEntity, 'appUserApplication'],
			[AppUserEntity, 'connections', AppUserConnectionEntity, 'appUser'],
			[InternalUserEntity, 'applications', InternalUserAppEntity, 'internalUser'],
			[InternalUserAppEntity, 'roles', InternalUserRoleEntity, 'internalUserApplication'],
			[InternalUserEntity, 'connections', InternalUserConnectionEntity, 'internalUser'],
			[RoleEntity, 'appsUsers', UserRoleEntity, 'role'],
			[RoleEntity, 'internalUsers', InternalUserRoleEntity, 'role'],
		];

		it.each(cases.map((row) => [row[0].name, row[1], row[2].name, row[3], ...row] as const))(
			'%s.%s is the inverse of %s.%s',
			(_entityName, _property, _targetName, inverse, entity, property, target) => {
				const found = relation(entity, property);

				expect(found.isOneToMany).toBe(true);
				expect(found.inverseEntityMetadata.target).toBe(target);
				expect(found.inverseRelation?.propertyName).toBe(inverse);
			},
		);
	});

	describe('owning (many-to-one) sides', () => {
		const cases: [EntityClass, string, string, EntityClass][] = [
			[RoleEntity, 'application', 'application_id', ApplicationEntity],
			[UserAppEntity, 'appUser', 'app_user_id', AppUserEntity],
			[UserAppEntity, 'application', 'application_id', ApplicationEntity],
			[InternalUserAppEntity, 'internalUser', 'internal_user_id', InternalUserEntity],
			[InternalUserAppEntity, 'application', 'application_id', ApplicationEntity],
			[UserRoleEntity, 'appUserApplication', 'app_user_application_id', UserAppEntity],
			[UserRoleEntity, 'role', 'role_id', RoleEntity],
			[
				InternalUserRoleEntity,
				'internalUserApplication',
				'internal_user_application_id',
				InternalUserAppEntity,
			],
			[InternalUserRoleEntity, 'role', 'role_id', RoleEntity],
			[AppUserConnectionEntity, 'appUser', 'app_user_id', AppUserEntity],
			[AppUserConnectionEntity, 'originApplication', 'origin_application_id', ApplicationEntity],
			[
				AppUserConnectionEntity,
				'destinationApplication',
				'destination_application_id',
				ApplicationEntity,
			],
			[InternalUserConnectionEntity, 'internalUser', 'internal_user_id', InternalUserEntity],
			[
				InternalUserConnectionEntity,
				'originApplication',
				'origin_application_id',
				ApplicationEntity,
			],
			[
				InternalUserConnectionEntity,
				'destinationApplication',
				'destination_application_id',
				ApplicationEntity,
			],
		];

		it.each(cases.map((row) => [row[0].name, row[1], row[2], row[3].name, ...row] as const))(
			'%s.%s joins on %s to %s',
			(_entityName, _property, column, _targetName, entity, property, _column, target) => {
				const found = relation(entity, property);

				expect(found.isManyToOne).toBe(true);
				expect(found.joinColumns.map((join) => join.databaseName)).toEqual([column]);
				expect(found.inverseEntityMetadata.target).toBe(target);
			},
		);

		it('reuses the plain foreign key columns instead of duplicating them', () => {
			const columns = metadataOf(UserRoleEntity).columns.map((column) => column.databaseName);

			expect(columns.filter((name) => name === 'role_id')).toHaveLength(1);
		});

		it('derives the application of a role assignment from the application assignment', () => {
			for (const entity of [UserRoleEntity, InternalUserRoleEntity]) {
				const columns = metadataOf(entity).columns.map((column) => column.databaseName);

				expect(columns).not.toContain('application_id');
			}
		});
	});

	describe('cascading deletes', () => {
		it.each([
			[UserRoleEntity, 'appUserApplication'],
			[InternalUserRoleEntity, 'internalUserApplication'],
		] as const)('%s.%s is deleted with its application assignment', (entity, property) => {
			expect(relation(entity, property).onDelete).toBe('CASCADE');
		});

		it('keeps the other foreign keys without a delete action', () => {
			expect(relation(UserRoleEntity, 'role').onDelete).toBeUndefined();
			expect(relation(InternalUserAppEntity, 'internalUser').onDelete).toBeUndefined();
		});
	});

	describe('relation options', () => {
		it('never loads a relation eagerly and never cascades', () => {
			for (const entity of ENTITIES) {
				for (const found of metadataOf(entity).relations) {
					expect(found.isEager).toBe(false);
					expect(found.isCascadeInsert).toBe(false);
					expect(found.isCascadeUpdate).toBe(false);
					expect(found.isCascadeRemove).toBe(false);
				}
			}
		});
	});

	describe('unique constraints', () => {
		const uniqueColumns = (entity: EntityClass) =>
			metadataOf(entity).uniques.map((unique) =>
				unique.columns.map((column) => column.propertyName),
			);

		it('keeps one role name per application', () => {
			expect(uniqueColumns(RoleEntity)).toContainEqual(['applicationId', 'name']);
		});

		it('keeps one application assignment per internal user and application', () => {
			expect(uniqueColumns(InternalUserAppEntity)).toContainEqual([
				'internalUserId',
				'applicationId',
			]);
		});

		it('keeps one application assignment per app user and application', () => {
			expect(uniqueColumns(UserAppEntity)).toContainEqual(['appUserId', 'applicationId']);
		});

		it('keeps one role assignment per internal user application assignment and role', () => {
			expect(uniqueColumns(InternalUserRoleEntity)).toContainEqual([
				'internalUserApplicationId',
				'roleId',
			]);
		});

		it('keeps one role assignment per app user application assignment and role', () => {
			expect(uniqueColumns(UserRoleEntity)).toContainEqual(['appUserApplicationId', 'roleId']);
		});

		it('keeps one internal user connection per user, origin and destination', () => {
			expect(uniqueColumns(InternalUserConnectionEntity)).toContainEqual([
				'internalUserId',
				'originApplicationId',
				'destinationApplicationId',
			]);
		});

		it('keeps one app user connection per user, origin and destination', () => {
			expect(uniqueColumns(AppUserConnectionEntity)).toContainEqual([
				'appUserId',
				'originApplicationId',
				'destinationApplicationId',
			]);
		});
	});
});
