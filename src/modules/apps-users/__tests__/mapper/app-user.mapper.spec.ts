import { describe, expect, it } from '@jest/globals';
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

describe('AppUserMapper.toAssignApplicationResponse', () => {
	it('wraps the assignment in a success envelope', () => {
		const assignment = Object.assign(new UserAppEntity(), {
			id: 1,
			appUserId: 5,
			applicationId: 3,
		});

		expect(AppUserMapper.toAssignApplicationResponse(assignment)).toMatchObject({
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

		expect(AppUserMapper.toAssignRoleResponse(assignment)).toMatchObject({
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

describe('AppUserMapper.toLoginResponse', () => {
	it('wraps the access token in a success envelope', () => {
		const response = AppUserMapper.toLoginResponse('jwt');

		expect(response.ok).toBe(true);
		expect(response.msg).toBe('Login successful');
		expect(response.data).toBeInstanceOf(ResponseLogin);
		expect(response.data).toEqual({ access_token: 'jwt' });
	});
});
