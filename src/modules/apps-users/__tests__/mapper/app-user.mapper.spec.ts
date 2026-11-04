import { describe, expect, it } from '@jest/globals';
import { AppUserConnectionEntity } from '../../../../common/database/app-user-connection/app-user-connection.entity';
import { ApplicationEntity } from '../../../../common/database/application/application.entity';
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
	it('wraps the assigned applications in a success envelope', () => {
		const data = [
			{
				applicationId: 1,
				applicationName: 'iam',
				applicationDescription: 'Identity',
				roles: [{ id: 2, name: 'ADMIN', description: 'Administrator' }],
			},
		];

		expect(AppUserMapper.toFindAssignedApplicationsResponse(data)).toMatchObject({
			ok: true,
			msg: 'Assigned applications retrieved successfully',
			data,
		});
	});

	it('returns an empty list when nothing is assigned', () => {
		expect(AppUserMapper.toFindAssignedApplicationsResponse([])).toMatchObject({
			ok: true,
			data: [],
		});
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
		const entity = AppUserMapper.toRoleAssignmentEntity(5, 7, 3);

		expect(entity).toBeInstanceOf(UserRoleEntity);
		expect(entity).toEqual({ appUserId: 5, roleId: 7, applicationId: 3 });
	});
});

describe('AppUserMapper.toAssignApplicationResponse', () => {
	it('wraps the assignment in a success envelope', () => {
		const assignment = Object.assign(new UserAppEntity(), {
			id: 1,
			appUserId: 5,
			applicationId: 3,
			internal: 'hidden',
		});

		expect(AppUserMapper.toAssignApplicationResponse(assignment)).toEqual({
			ok: true,
			msg: 'Application assigned to user successfully',
			data: { id: 1, appUserId: 5, applicationId: 3 },
		});
	});
});

describe('AppUserMapper.toAssignRoleResponse', () => {
	it('wraps the assignment in a success envelope', () => {
		const assignment = Object.assign(new UserRoleEntity(), {
			id: 1,
			appUserId: 5,
			roleId: 7,
			applicationId: 3,
		});

		expect(AppUserMapper.toAssignRoleResponse(assignment)).toEqual({
			ok: true,
			msg: 'Role assigned to user successfully',
			data: { id: 1, appUserId: 5, roleId: 7, applicationId: 3 },
		});
	});
});

const connection = {
	id: 1,
	originApplicationId: 1,
	originApplicationName: 'iam',
	destinationApplicationId: 2,
	destinationApplicationName: 'crm',
};

describe('AppUserMapper.toFindConnectionsResponse', () => {
	it('wraps the connections in a success envelope', () => {
		expect(AppUserMapper.toFindConnectionsResponse([connection])).toMatchObject({
			ok: true,
			msg: 'Connections retrieved successfully',
			data: [connection],
		});
	});

	it('returns an empty list when there are no connections', () => {
		expect(AppUserMapper.toFindConnectionsResponse([])).toMatchObject({ ok: true, data: [] });
	});
});

describe('AppUserMapper.toCreateConnectionResponse', () => {
	it('wraps the connection in a success envelope', () => {
		expect(AppUserMapper.toCreateConnectionResponse(connection)).toMatchObject({
			ok: true,
			msg: 'Connection created successfully',
			data: connection,
		});
	});
});

const applications = [
	Object.assign(new ApplicationEntity(), { id: 1, name: 'iam' }),
	Object.assign(new ApplicationEntity(), { id: 2, name: 'crm' }),
];

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

describe('AppUserMapper.toApplicationIds', () => {
	it('returns the unique origin and destination ids of every connection', () => {
		const connections = [
			Object.assign(new AppUserConnectionEntity(), {
				id: 1,
				originApplicationId: 1,
				destinationApplicationId: 2,
			}),
			Object.assign(new AppUserConnectionEntity(), {
				id: 2,
				originApplicationId: 1,
				destinationApplicationId: 3,
			}),
		];

		expect(AppUserMapper.toApplicationIds(connections)).toEqual([1, 2, 3]);
	});

	it('returns an empty list when there are no connections', () => {
		expect(AppUserMapper.toApplicationIds([])).toEqual([]);
	});
});

describe('AppUserMapper.toConnectionResponse', () => {
	it('resolves the application names and exposes only the documented fields', () => {
		const entity = Object.assign(new AppUserConnectionEntity(), {
			id: 9,
			appUserId: 5,
			originApplicationId: 1,
			destinationApplicationId: 2,
			createdAt: new Date('2024-01-01T00:00:00Z'),
		});

		const response = AppUserMapper.toConnectionResponse(entity, applications);

		expect(response).toEqual({
			id: 9,
			originApplicationId: 1,
			originApplicationName: 'iam',
			destinationApplicationId: 2,
			destinationApplicationName: 'crm',
		});
	});

	it('leaves the name undefined when the application is not in the list', () => {
		const entity = Object.assign(new AppUserConnectionEntity(), {
			id: 9,
			originApplicationId: 1,
			destinationApplicationId: 99,
		});

		expect(AppUserMapper.toConnectionResponse(entity, applications)).toMatchObject({
			originApplicationName: 'iam',
			destinationApplicationName: undefined,
		});
	});
});

describe('AppUserMapper.toConnectionResponses', () => {
	it('maps every connection keeping the given order', () => {
		const connections = [
			Object.assign(new AppUserConnectionEntity(), {
				id: 2,
				originApplicationId: 2,
				destinationApplicationId: 1,
			}),
			Object.assign(new AppUserConnectionEntity(), {
				id: 1,
				originApplicationId: 1,
				destinationApplicationId: 2,
			}),
		];

		const responses = AppUserMapper.toConnectionResponses(connections, applications);

		expect(responses.map((response) => response.id)).toEqual([2, 1]);
		expect(responses[0]).toMatchObject({
			originApplicationName: 'crm',
			destinationApplicationName: 'iam',
		});
	});

	it('returns an empty list when there are no connections', () => {
		expect(AppUserMapper.toConnectionResponses([], applications)).toEqual([]);
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
