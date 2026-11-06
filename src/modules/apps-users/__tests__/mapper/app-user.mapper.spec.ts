import { describe, expect, it } from '@jest/globals';
import {
	applicationAssignment,
	applicationRow,
	roleRow,
} from '../../../../../test/helpers/assignment-rows';
import { AppUserConnectionEntity } from '../../../../common/database/app-user-connection/app-user-connection.entity';
import { AppUserEntity } from '../../../../common/database/app-user/app-user.entity';
import { UserAppEntity } from '../../../../common/database/user-application/user-app.entity';
import { UserRoleEntity } from '../../../../common/database/user-role/user-role.entity';
import { ResponseLogin } from '../../../../common/dto/response-login.dto';
import { AppUserMapper } from '../../app-user.mapper';

const stored = Object.assign(new AppUserEntity(), {
	id: 5,
	clienteId: 'client-1',
	clienteSecret: 'HASH',
	name: 'Billing',
	description: 'Billing service',
});

describe('AppUserMapper.toEntity', () => {
	it('builds an entity from the dto, the clienteId and the hashed secret', () => {
		const entity = AppUserMapper.toEntity(
			{ name: 'Billing', description: 'Billing service' },
			'client-1',
			'HASH',
		);

		expect(entity).toBeInstanceOf(AppUserEntity);
		expect(entity).toMatchObject({
			clienteId: 'client-1',
			clienteSecret: 'HASH',
			name: 'Billing',
			description: 'Billing service',
		});
	});

	it('leaves the id unset', () => {
		const entity = AppUserMapper.toEntity({ name: 'n', description: 'd' }, 'c', 'h');

		expect(entity.id).toBeUndefined();
	});
});

describe('AppUserMapper.toResponseWithSecret', () => {
	it('exposes the plaintext secret instead of the stored hash', () => {
		const response = AppUserMapper.toResponseWithSecret(stored, 'plain-secret');

		expect(response).toEqual({
			id: 5,
			clienteId: 'client-1',
			clienteSecret: 'plain-secret',
			name: 'Billing',
			description: 'Billing service',
		});
	});
});

describe('AppUserMapper.toResponse', () => {
	it('exposes the user without any secret', () => {
		const response = AppUserMapper.toResponse(stored);

		expect(response).toEqual({
			id: 5,
			clienteId: 'client-1',
			name: 'Billing',
			description: 'Billing service',
		});
		expect(response).not.toHaveProperty('clienteSecret');
	});
});

describe('AppUserMapper.toCreateResponse', () => {
	it('wraps the created user with the plaintext secret in a success envelope', () => {
		const response = AppUserMapper.toCreateResponse(stored, 'plain-secret');

		expect(response).toMatchObject({
			ok: true,
			msg: 'Application user created successfully — store clienteSecret now, it cannot be retrieved again',
			data: {
				id: 5,
				clienteId: 'client-1',
				clienteSecret: 'plain-secret',
				name: 'Billing',
				description: 'Billing service',
			},
		});
	});
});

describe('AppUserMapper.toFindAllResponse', () => {
	it('wraps every mapped user in a success envelope without secrets', () => {
		const response = AppUserMapper.toFindAllResponse([stored]);

		expect(response).toMatchObject({
			ok: true,
			msg: 'Application users retrieved successfully',
			data: [{ id: 5, clienteId: 'client-1', name: 'Billing', description: 'Billing service' }],
		});
		expect(response.data?.[0]).not.toHaveProperty('clienteSecret');
	});

	it('returns an empty list when there are no users', () => {
		expect(AppUserMapper.toFindAllResponse([])).toMatchObject({ ok: true, data: [] });
	});
});

describe('AppUserMapper.toFindAssignedApplicationsResponse', () => {
	it('wraps the user with its assignment tree in a success envelope', () => {
		const user = Object.assign(new AppUserEntity(), {
			id: 5,
			applications: [
				applicationAssignment(applicationRow(1, 'iam', 'Identity'), [
					roleRow(2, 1, 'ADMIN', 'Administrator'),
				]),
			],
		});

		const response = AppUserMapper.toFindAssignedApplicationsResponse(user);

		expect(response).toMatchObject({
			ok: true,
			msg: 'Assigned applications retrieved successfully',
		});
		// The entity travels as it is, no copy into a DTO.
		expect(response.data).toBe(user);
	});

	it('keeps an empty applications list when nothing is assigned', () => {
		const user = Object.assign(new AppUserEntity(), { id: 5, applications: [] });

		expect(AppUserMapper.toFindAssignedApplicationsResponse(user).data?.applications).toEqual([]);
	});
});

describe('AppUserMapper.toApplicationAssignmentEntity', () => {
	it('builds an assignment entity without an id', () => {
		const entity = AppUserMapper.toApplicationAssignmentEntity(5, 3);

		expect(entity).toBeInstanceOf(UserAppEntity);
		expect(entity).toEqual({ appUserId: 5, applicationId: 3 });
	});
});

describe('AppUserMapper.toRoleAssignmentEntity', () => {
	it('builds an assignment entity without an id', () => {
		const entity = AppUserMapper.toRoleAssignmentEntity(9, 7);

		expect(entity).toBeInstanceOf(UserRoleEntity);
		expect(entity).toEqual({ appUserApplicationId: 9, roleId: 7 });
	});
});

describe('AppUserMapper.toAssignApplicationResponse', () => {
	it('wraps the user with its assignment tree in a success envelope', () => {
		const response = AppUserMapper.toAssignApplicationResponse(stored);

		expect(response.ok).toBe(true);
		expect(response.msg).toBe('Application assigned to user successfully');
		expect(response.data).toBe(stored);
	});
});

describe('AppUserMapper.toAssignRoleResponse', () => {
	it('wraps the user with its assignment tree in a success envelope', () => {
		const response = AppUserMapper.toAssignRoleResponse(stored);

		expect(response.ok).toBe(true);
		expect(response.msg).toBe('Role assigned to user successfully');
		expect(response.data).toBe(stored);
	});
});

describe('AppUserMapper.toFindConnectionsResponse', () => {
	it('wraps the user, connections included, in a success envelope', () => {
		const user = Object.assign(new AppUserEntity(), { id: 5, connections: [] });

		const response = AppUserMapper.toFindConnectionsResponse(user);

		expect(response.ok).toBe(true);
		expect(response.msg).toBe('Connections retrieved successfully');
		expect(response.data).toBe(user);
	});
});

describe('AppUserMapper.toCreateConnectionResponse', () => {
	it('wraps the user, connections included, in a success envelope', () => {
		const user = Object.assign(new AppUserEntity(), { id: 5, connections: [] });

		const response = AppUserMapper.toCreateConnectionResponse(user);

		expect(response.ok).toBe(true);
		expect(response.msg).toBe('Connection created successfully');
		expect(response.data).toBe(user);
	});
});

describe('AppUserMapper.toConnectionEntity', () => {
	it('builds a connection entity without an id', () => {
		const entity = AppUserMapper.toConnectionEntity(5, {
			originApplicationId: 1,
			destinationApplicationId: 2,
		});

		expect(entity).toBeInstanceOf(AppUserConnectionEntity);
		expect(entity).toEqual({ appUserId: 5, originApplicationId: 1, destinationApplicationId: 2 });
	});
});

describe('AppUserMapper.toLoginResponse', () => {
	it('wraps the access token in a success envelope', () => {
		const response = AppUserMapper.toLoginResponse('jwt');

		expect(response.ok).toBe(true);
		expect(response.msg).toBe('Login successful');
		expect(response.data).toBeInstanceOf(ResponseLogin);
		expect(response.data).toEqual({ access_token: 'jwt' });
	});
});
