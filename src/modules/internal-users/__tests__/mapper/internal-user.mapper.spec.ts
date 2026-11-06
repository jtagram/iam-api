import { describe, expect, it } from '@jest/globals';
import {
	applicationAssignment,
	applicationRow,
	roleRow,
} from '../../../../../test/helpers/assignment-rows';
import { InternalUserConnectionEntity } from '../../../../common/database/internal-user-connection/internal-user-connection.entity';
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

const publicUser = { id: 5, name: 'Ada', lastname: 'Lovelace', email: 'ada@example.com' };

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

describe('InternalUserMapper.toInternalUserResponse', () => {
	it('exposes only the public fields', () => {
		expect(InternalUserMapper.toInternalUserResponse(stored)).toEqual(publicUser);
	});

	it('does not expose the password', () => {
		expect(InternalUserMapper.toInternalUserResponse(stored)).not.toHaveProperty('password');
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

describe('InternalUserMapper.toFindAssignedApplicationsResponse', () => {
	it('wraps the user with its assignment tree in a success envelope', () => {
		const user = Object.assign(new InternalUserEntity(), {
			id: 5,
			applications: [
				applicationAssignment(applicationRow(2, 'ticket-hub', 'Tickets'), [
					roleRow(3, 2, 'ADMIN', 'Admin'),
				]),
			],
		});

		const response = InternalUserMapper.toFindAssignedApplicationsResponse(user);

		expect(response.ok).toBe(true);
		expect(response.msg).toBe('Assigned applications retrieved successfully');
		// The entity travels as it is, no copy into a DTO.
		expect(response.data).toBe(user);
	});

	it('keeps an empty applications list when nothing is assigned', () => {
		const user = Object.assign(new InternalUserEntity(), { id: 5, applications: [] });

		const response = InternalUserMapper.toFindAssignedApplicationsResponse(user);

		expect(response.ok).toBe(true);
		expect(response.data?.applications).toEqual([]);
	});
});

describe('InternalUserMapper.toApplicationAssignmentEntity', () => {
	it('builds an assignment entity without an id', () => {
		const entity = InternalUserMapper.toApplicationAssignmentEntity(5, 2);

		expect(entity).toBeInstanceOf(InternalUserAppEntity);
		expect(entity).toEqual({ internalUserId: 5, applicationId: 2 });
	});
});

describe('InternalUserMapper.toRoleAssignmentEntity', () => {
	it('builds an assignment entity without an id', () => {
		const entity = InternalUserMapper.toRoleAssignmentEntity(7, 3);

		expect(entity).toBeInstanceOf(InternalUserRoleEntity);
		expect(entity).toEqual({ internalUserApplicationId: 7, roleId: 3 });
	});
});

describe('InternalUserMapper.toAssignApplicationResponse', () => {
	it('wraps the user with its assignment tree in a success envelope', () => {
		const response = InternalUserMapper.toAssignApplicationResponse(stored);

		expect(response.ok).toBe(true);
		expect(response.msg).toBe('Application assigned to internal user successfully');
		expect(response.data).toBe(stored);
	});
});

describe('InternalUserMapper.toAssignRoleResponse', () => {
	it('wraps the user with its assignment tree in a success envelope', () => {
		const response = InternalUserMapper.toAssignRoleResponse(stored);

		expect(response.ok).toBe(true);
		expect(response.msg).toBe('Role assigned to internal user successfully');
		expect(response.data).toBe(stored);
	});
});

describe('InternalUserMapper.toFindConnectionsResponse', () => {
	it('wraps the user, connections included, in a success envelope', () => {
		const user = Object.assign(new InternalUserEntity(), { id: 5, connections: [] });

		const response = InternalUserMapper.toFindConnectionsResponse(user);

		expect(response.ok).toBe(true);
		expect(response.msg).toBe('Connections retrieved successfully');
		expect(response.data).toBe(user);
	});
});

describe('InternalUserMapper.toCreateConnectionResponse', () => {
	it('wraps the user, connections included, in a success envelope', () => {
		const user = Object.assign(new InternalUserEntity(), { id: 5, connections: [] });

		const response = InternalUserMapper.toCreateConnectionResponse(user);

		expect(response.ok).toBe(true);
		expect(response.msg).toBe('Connection created successfully');
		expect(response.data).toBe(user);
	});
});

describe('InternalUserMapper.toConnectionEntity', () => {
	it('builds a connection entity without an id', () => {
		const entity = InternalUserMapper.toConnectionEntity(5, {
			originApplicationId: 1,
			destinationApplicationId: 2,
		});

		expect(entity).toBeInstanceOf(InternalUserConnectionEntity);
		expect(entity).toEqual({
			internalUserId: 5,
			originApplicationId: 1,
			destinationApplicationId: 2,
		});
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

describe('InternalUserMapper.toFindAllWithApplicationsResponse', () => {
	it('wraps the users with their applications in a success envelope', () => {
		const data = [Object.assign(new InternalUserEntity(), { id: 1, name: 'A', applications: [] })];

		const response = InternalUserMapper.toFindAllWithApplicationsResponse(data);

		expect(response).toMatchObject({
			ok: true,
			msg: 'Internal users with applications retrieved successfully',
		});
		// The entities travel as they are, no copy into a DTO.
		expect(response.data).toBe(data);
	});

	it('returns an empty list when there are no users', () => {
		expect(InternalUserMapper.toFindAllWithApplicationsResponse([])).toMatchObject({
			ok: true,
			data: [],
		});
	});
});
