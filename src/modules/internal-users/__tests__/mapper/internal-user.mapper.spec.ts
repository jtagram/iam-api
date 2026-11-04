import { describe, expect, it } from '@jest/globals';
import { InternalUserAppEntity } from '../../../../common/database/internal-user/internal-user-app.entity';
import { InternalUserRoleEntity } from '../../../../common/database/internal-user/internal-user-role.entity';
import { InternalUserEntity } from '../../../../common/database/internal-user/internal-user.entity';
import { ResponseLogin } from '../../../../common/dto/response-login.dto';
import { InternalUserMapper } from '../../internal-user.mapper';

const stored = Object.assign(new InternalUserEntity(), {
	id: 5,
	name: 'Ada',
	lastname: 'Lovelace',
	email: 'ada@example.com',
	password: 'HASH',
});

describe('InternalUserMapper.toEntity', () => {
	it('builds an entity from the dto and the hashed password', () => {
		const entity = InternalUserMapper.toEntity(
			{
				name: 'Ada',
				lastname: 'Lovelace',
				email: 'ada@example.com',
				password: 'plaintext',
			},
			'HASH',
		);

		expect(entity).toBeInstanceOf(InternalUserEntity);
		expect(entity).toMatchObject({
			name: 'Ada',
			lastname: 'Lovelace',
			email: 'ada@example.com',
			password: 'HASH',
		});
	});

	it('never stores the plaintext password from the dto', () => {
		const entity = InternalUserMapper.toEntity(
			{ name: 'a', lastname: 'b', email: 'c@d.com', password: 'plaintext' },
			'HASH',
		);

		expect(JSON.stringify(entity)).not.toContain('plaintext');
	});
});

describe('InternalUserMapper.toCreatedResponse', () => {
	it('exposes the user without the password', () => {
		const response = InternalUserMapper.toCreatedResponse(stored);

		expect(response).toEqual({
			id: 5,
			name: 'Ada',
			lastname: 'Lovelace',
			email: 'ada@example.com',
		});
		expect(response).not.toHaveProperty('password');
	});
});

describe('InternalUserMapper.toResponse', () => {
	it('returns the same shape as toCreatedResponse', () => {
		expect(InternalUserMapper.toResponse(stored)).toEqual(
			InternalUserMapper.toCreatedResponse(stored),
		);
	});

	it('does not expose the password', () => {
		expect(InternalUserMapper.toResponse(stored)).not.toHaveProperty('password');
	});
});

const publicUser = { id: 5, name: 'Ada', lastname: 'Lovelace', email: 'ada@example.com' };

describe('InternalUserMapper.toApplicationAssignmentResponse', () => {
	it('maps the entity to a plain object with only the documented fields', () => {
		const entity = Object.assign(new InternalUserAppEntity(), {
			id: 1,
			internalUserId: 5,
			applicationId: 2,
		});

		const response = InternalUserMapper.toApplicationAssignmentResponse(entity);

		expect(response).toEqual({ id: 1, internalUserId: 5, applicationId: 2 });
		expect(response).not.toBeInstanceOf(InternalUserAppEntity);
	});
});

describe('InternalUserMapper.toRoleAssignmentResponse', () => {
	it('maps the entity to a plain object with only the documented fields', () => {
		const entity = Object.assign(new InternalUserRoleEntity(), {
			id: 1,
			internalUserId: 5,
			applicationId: 2,
			roleId: 3,
		});

		const response = InternalUserMapper.toRoleAssignmentResponse(entity);

		expect(response).toEqual({ id: 1, internalUserId: 5, applicationId: 2, roleId: 3 });
		expect(response).not.toBeInstanceOf(InternalUserRoleEntity);
	});
});

describe('InternalUserMapper.toCreateResponse', () => {
	it('wraps the created user without the password in a success envelope', () => {
		const response = InternalUserMapper.toCreateResponse(stored);

		expect(response.ok).toBe(true);
		expect(response.msg).toBe('Internal user created successfully');
		expect(response.data).toEqual(publicUser);
	});
});

describe('InternalUserMapper.toFindAllResponse', () => {
	it('wraps every mapped user in a success envelope without passwords', () => {
		const response = InternalUserMapper.toFindAllResponse([stored]);

		expect(response.ok).toBe(true);
		expect(response.msg).toBe('Internal users retrieved successfully');
		expect(response.data).toEqual([publicUser]);
	});

	it('returns an empty list when there are no users', () => {
		const response = InternalUserMapper.toFindAllResponse([]);

		expect(response.ok).toBe(true);
		expect(response.data).toEqual([]);
	});
});

describe('InternalUserMapper.toFindByApplicationAndRolesResponse', () => {
	it('wraps every mapped user in a success envelope without passwords', () => {
		const response = InternalUserMapper.toFindByApplicationAndRolesResponse([stored]);

		expect(response.ok).toBe(true);
		expect(response.msg).toBe('Internal users retrieved successfully');
		expect(response.data).toEqual([publicUser]);
	});

	it('returns an empty list when no user matches', () => {
		const response = InternalUserMapper.toFindByApplicationAndRolesResponse([]);

		expect(response.ok).toBe(true);
		expect(response.data).toEqual([]);
	});
});

describe('InternalUserMapper.toFindAssignedApplicationsResponse', () => {
	it('wraps the assigned applications in a success envelope', () => {
		const assigned = [
			{
				applicationId: 2,
				applicationName: 'ticket-hub',
				applicationDescription: 'Tickets',
				roles: [{ id: 3, name: 'ADMIN', description: 'Admin' }],
			},
		];

		const response = InternalUserMapper.toFindAssignedApplicationsResponse(assigned);

		expect(response.ok).toBe(true);
		expect(response.msg).toBe('Assigned applications retrieved successfully');
		expect(response.data).toEqual(assigned);
	});

	it('returns an empty list when nothing is assigned', () => {
		const response = InternalUserMapper.toFindAssignedApplicationsResponse([]);

		expect(response.ok).toBe(true);
		expect(response.data).toEqual([]);
	});
});

describe('InternalUserMapper.toAssignApplicationResponse', () => {
	it('wraps the plain assignment in a success envelope', () => {
		const entity = Object.assign(new InternalUserAppEntity(), {
			id: 1,
			internalUserId: 5,
			applicationId: 2,
		});

		const response = InternalUserMapper.toAssignApplicationResponse(entity);

		expect(response.ok).toBe(true);
		expect(response.msg).toBe('Application assigned to internal user successfully');
		expect(response.data).toEqual({ id: 1, internalUserId: 5, applicationId: 2 });
	});
});

describe('InternalUserMapper.toAssignRoleResponse', () => {
	it('wraps the plain assignment in a success envelope', () => {
		const entity = Object.assign(new InternalUserRoleEntity(), {
			id: 1,
			internalUserId: 5,
			applicationId: 2,
			roleId: 3,
		});

		const response = InternalUserMapper.toAssignRoleResponse(entity);

		expect(response.ok).toBe(true);
		expect(response.msg).toBe('Role assigned to internal user successfully');
		expect(response.data).toEqual({ id: 1, internalUserId: 5, applicationId: 2, roleId: 3 });
	});
});

describe('InternalUserMapper.toFindConnectionsResponse', () => {
	const connection = {
		id: 1,
		originApplicationId: 2,
		originApplicationName: 'iam',
		destinationApplicationId: 3,
		destinationApplicationName: 'ticket-hub',
	};

	it('wraps the connections in a success envelope', () => {
		const response = InternalUserMapper.toFindConnectionsResponse([connection]);

		expect(response.ok).toBe(true);
		expect(response.msg).toBe('Connections retrieved successfully');
		expect(response.data).toEqual([connection]);
	});

	it('returns an empty list when there are no connections', () => {
		const response = InternalUserMapper.toFindConnectionsResponse([]);

		expect(response.ok).toBe(true);
		expect(response.data).toEqual([]);
	});
});

describe('InternalUserMapper.toCreateConnectionResponse', () => {
	it('wraps the connection in a success envelope', () => {
		const connection = {
			id: 1,
			originApplicationId: 2,
			originApplicationName: 'iam',
			destinationApplicationId: 3,
			destinationApplicationName: 'ticket-hub',
		};

		const response = InternalUserMapper.toCreateConnectionResponse(connection);

		expect(response.ok).toBe(true);
		expect(response.msg).toBe('Connection created successfully');
		expect(response.data).toEqual(connection);
	});
});

describe('InternalUserMapper.toLoginResponse', () => {
	it('wraps the access token in a success envelope', () => {
		const response = InternalUserMapper.toLoginResponse('jwt');

		expect(response.ok).toBe(true);
		expect(response.msg).toBe('Login successful');
		expect(response.data).toBeInstanceOf(ResponseLogin);
		expect(response.data).toEqual({ access_token: 'jwt' });
	});
});
