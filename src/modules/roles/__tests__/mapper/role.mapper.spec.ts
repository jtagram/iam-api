import { describe, expect, it } from '@jest/globals';
import { ApplicationEntity } from '../../../../common/database/application/application.entity';
import { RoleEntity } from '../../../../common/database/role/role.entity';
import { RoleMapper } from '../../role.mapper';

describe('RoleMapper.toEntity', () => {
	it('builds an entity from the dto', () => {
		const entity = RoleMapper.toEntity({
			applicationId: 3,
			name: 'ADMIN',
			description: 'Administrator',
		});

		expect(entity).toBeInstanceOf(RoleEntity);
		expect(entity).toMatchObject({
			applicationId: 3,
			name: 'ADMIN',
			description: 'Administrator',
		});
	});

	it('leaves the id unset', () => {
		const entity = RoleMapper.toEntity({
			applicationId: 3,
			name: 'ADMIN',
			description: 'd',
		});

		expect(entity.id).toBeUndefined();
	});
});

describe('RoleMapper.toResponse', () => {
	it('exposes id, applicationId, name and description', () => {
		const entity = Object.assign(new RoleEntity(), {
			id: 9,
			applicationId: 3,
			name: 'ADMIN',
			description: 'Administrator',
		});

		expect(RoleMapper.toResponse(entity)).toEqual({
			id: 9,
			applicationId: 3,
			name: 'ADMIN',
			description: 'Administrator',
		});
	});
});

describe('RoleMapper.toCreateResponse', () => {
	it('wraps the mapped role in a success envelope', () => {
		const entity = Object.assign(new RoleEntity(), {
			id: 9,
			applicationId: 3,
			name: 'ADMIN',
			description: 'Administrator',
		});

		expect(RoleMapper.toCreateResponse(entity)).toMatchObject({
			ok: true,
			msg: 'Role created successfully',
			data: { id: 9, applicationId: 3, name: 'ADMIN', description: 'Administrator' },
		});
	});
});

describe('RoleMapper.toApplicationRolesResponse', () => {
	const application = Object.assign(new ApplicationEntity(), {
		id: 1,
		name: 'iam',
		description: 'Identity',
	});

	it('keeps only the roles that belong to the application', () => {
		const own = Object.assign(new RoleEntity(), {
			id: 1,
			applicationId: 1,
			name: 'ADMIN',
			description: 'a',
		});
		const other = Object.assign(new RoleEntity(), {
			id: 2,
			applicationId: 2,
			name: 'PAYER',
			description: 'b',
		});

		expect(RoleMapper.toApplicationRolesResponse(application, [own, other])).toEqual({
			applicationId: 1,
			applicationName: 'iam',
			applicationDescription: 'Identity',
			roles: [{ id: 1, name: 'ADMIN', description: 'a' }],
		});
	});

	it('returns an empty roles list when the application has no roles', () => {
		expect(RoleMapper.toApplicationRolesResponse(application, [])).toEqual({
			applicationId: 1,
			applicationName: 'iam',
			applicationDescription: 'Identity',
			roles: [],
		});
	});
});

describe('RoleMapper.toApplicationRoleItems', () => {
	it('keeps only the roles of the given application as items', () => {
		const own = Object.assign(new RoleEntity(), {
			id: 1,
			applicationId: 1,
			name: 'ADMIN',
			description: 'a',
		});
		const other = Object.assign(new RoleEntity(), {
			id: 2,
			applicationId: 2,
			name: 'PAYER',
			description: 'b',
		});

		expect(RoleMapper.toApplicationRoleItems([own, other], 1)).toEqual([
			{ id: 1, name: 'ADMIN', description: 'a' },
		]);
	});

	it('returns an empty list when no role belongs to the application', () => {
		expect(RoleMapper.toApplicationRoleItems([], 1)).toEqual([]);
	});
});

describe('RoleMapper.toFindAllGroupedByApplicationResponse', () => {
	it('wraps the applications with their roles in a success envelope', () => {
		const data = [
			{
				applicationId: 1,
				applicationName: 'iam',
				applicationDescription: 'Identity',
				roles: [{ id: 1, name: 'ADMIN', description: 'a' }],
			},
			{
				applicationId: 2,
				applicationName: 'billing',
				applicationDescription: 'Billing',
				roles: [],
			},
		];

		expect(RoleMapper.toFindAllGroupedByApplicationResponse(data)).toEqual({
			ok: true,
			msg: 'Roles grouped by application retrieved successfully',
			data,
		});
	});

	it('returns an empty list when there are no applications', () => {
		expect(RoleMapper.toFindAllGroupedByApplicationResponse([])).toMatchObject({
			ok: true,
			msg: 'Roles grouped by application retrieved successfully',
			data: [],
		});
	});
});

describe('RoleMapper.toFindAllByApplicationIdResponse', () => {
	it('wraps every mapped role in a success envelope', () => {
		const entities = [
			Object.assign(new RoleEntity(), { id: 1, applicationId: 3, name: 'ADMIN', description: 'a' }),
			Object.assign(new RoleEntity(), { id: 2, applicationId: 3, name: 'USER', description: 'b' }),
		];

		expect(RoleMapper.toFindAllByApplicationIdResponse(entities)).toMatchObject({
			ok: true,
			msg: 'Roles retrieved successfully',
			data: [
				{ id: 1, applicationId: 3, name: 'ADMIN', description: 'a' },
				{ id: 2, applicationId: 3, name: 'USER', description: 'b' },
			],
		});
	});

	it('returns an empty list when there are no roles', () => {
		expect(RoleMapper.toFindAllByApplicationIdResponse([])).toMatchObject({ ok: true, data: [] });
	});
});
