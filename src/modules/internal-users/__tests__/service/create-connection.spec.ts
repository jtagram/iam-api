import { beforeEach, describe, expect, it } from '@jest/globals';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { mockFn } from '../../../../../test/helpers/mocks';
import { ApplicationsRepository } from '../../../../common/database/application/applications.repository';
import { RolesRepository } from '../../../../common/database/role/roles.repository';
import { InternalUsersRepository } from '../../../../common/database/internal-user/internal-users.repository';
import { InternalUserConnectionEntity } from '../../../../common/database/internal-user-connection/internal-user-connection.entity';
import { InternalUsersService } from '../../internal-users.service';

describe('InternalUsersService.createConnection', () => {
	let users: {
		findById: ReturnType<typeof mockFn>;
		hasConnection: ReturnType<typeof mockFn>;
		findByIdWithConnection: ReturnType<typeof mockFn>;
		findApplicationAssignment: ReturnType<typeof mockFn>;
		addConnection: ReturnType<typeof mockFn>;
	};
	let service: InternalUsersService;
	const dto = { originApplicationId: 10, destinationApplicationId: 20 };
	const userWithConnection = {
		id: 1,
		connections: [
			{
				id: 90,
				originApplicationId: 10,
				destinationApplicationId: 20,
				originApplication: { id: 10, name: 'iam' },
				destinationApplication: { id: 20, name: 'hub' },
			},
		],
	};

	beforeEach(() => {
		users = {
			findById: mockFn(),
			findApplicationAssignment: mockFn(),
			hasConnection: mockFn(),
			addConnection: mockFn(),
			findByIdWithConnection: mockFn(),
		};
		service = new InternalUsersService(
			users as unknown as InternalUsersRepository,
			{} as unknown as ApplicationsRepository,
			{} as unknown as RolesRepository,
		);
		users.findById.mockResolvedValue({ id: 1 });
		users.findByIdWithConnection.mockResolvedValue(userWithConnection);
		users.findApplicationAssignment.mockResolvedValue({ id: 5 });
		users.hasConnection.mockResolvedValue(false);
		users.addConnection.mockImplementation((entity: InternalUserConnectionEntity) =>
			Promise.resolve(Object.assign(entity, { id: 90 })),
		);
	});

	it('throws NotFound when the user does not exist', async () => {
		users.findById.mockResolvedValue(null);

		await expect(service.createConnection(1, dto)).rejects.toThrow(
			new NotFoundException('Internal user not found'),
		);
		expect(users.findApplicationAssignment).not.toHaveBeenCalled();
	});

	it('throws BadRequest when origin and destination are the same application', async () => {
		await expect(
			service.createConnection(1, {
				originApplicationId: 10,
				destinationApplicationId: 10,
			}),
		).rejects.toThrow(
			new BadRequestException('Origin and destination applications must be different'),
		);
		expect(users.findApplicationAssignment).not.toHaveBeenCalled();
	});

	it('throws BadRequest when the origin is not assigned to the user', async () => {
		users.findApplicationAssignment.mockResolvedValueOnce(null);

		await expect(service.createConnection(1, dto)).rejects.toThrow(
			new BadRequestException('The user does not have the origin application assigned'),
		);
		expect(users.findApplicationAssignment).toHaveBeenCalledTimes(1);
		expect(users.findApplicationAssignment).toHaveBeenCalledWith(1, 10);
		expect(users.hasConnection).not.toHaveBeenCalled();
		expect(users.addConnection).not.toHaveBeenCalled();
	});

	it('throws BadRequest when the destination is not assigned to the user', async () => {
		users.findApplicationAssignment.mockResolvedValueOnce({ id: 5 }).mockResolvedValueOnce(null);

		await expect(service.createConnection(1, dto)).rejects.toThrow(
			new BadRequestException('The user does not have the destination application assigned'),
		);
		expect(users.findApplicationAssignment).toHaveBeenNthCalledWith(1, 1, 10);
		expect(users.findApplicationAssignment).toHaveBeenNthCalledWith(2, 1, 20);
		expect(users.hasConnection).not.toHaveBeenCalled();
		expect(users.addConnection).not.toHaveBeenCalled();
	});

	it('reports the origin first when neither application is assigned', async () => {
		users.findApplicationAssignment.mockResolvedValue(null);

		await expect(service.createConnection(1, dto)).rejects.toThrow(
			new BadRequestException('The user does not have the origin application assigned'),
		);
		expect(users.findApplicationAssignment).toHaveBeenCalledTimes(1);
	});

	it('throws Conflict when the connection already exists', async () => {
		users.hasConnection.mockResolvedValue(true);

		await expect(service.createConnection(1, dto)).rejects.toThrow(
			new ConflictException('This connection already exists for the user'),
		);
		expect(users.hasConnection).toHaveBeenCalledWith(1, 10, 20);
		expect(users.addConnection).not.toHaveBeenCalled();
	});

	it('persists a connection for the user, origin and destination', async () => {
		await service.createConnection(1, dto);

		expect(users.addConnection).toHaveBeenCalledTimes(1);
		const entity = users.addConnection.mock.calls[0][0] as InternalUserConnectionEntity;
		expect(entity).toBeInstanceOf(InternalUserConnectionEntity);
		expect(entity).toMatchObject({
			internalUserId: 1,
			originApplicationId: 10,
			destinationApplicationId: 20,
		});
	});

	it('returns the user reloaded with only the created connection, applications included', async () => {
		const response = await service.createConnection(1, dto);

		expect(response).toEqual({
			ok: true,
			msg: 'Connection created successfully',
			data: userWithConnection,
		});
		expect(response.data).toBe(userWithConnection);
		expect(users.findByIdWithConnection).toHaveBeenCalledWith(1, 90);
	});

	it('does not reload the user when a validation fails', async () => {
		users.hasConnection.mockResolvedValue(true);

		await expect(service.createConnection(1, dto)).rejects.toThrow(ConflictException);
		expect(users.findByIdWithConnection).not.toHaveBeenCalled();
	});

	it('throws NotFound when the user disappears before the reload', async () => {
		users.findByIdWithConnection.mockResolvedValue(null);

		await expect(service.createConnection(1, dto)).rejects.toThrow(NotFoundException);
	});

	it('allows the reverse direction as a separate connection', async () => {
		users.hasConnection.mockImplementation((_user: number, origin: number) =>
			Promise.resolve(origin === 10),
		);

		await expect(
			service.createConnection(1, {
				originApplicationId: 20,
				destinationApplicationId: 10,
			}),
		).resolves.toBeDefined();
	});

	it('propagates a repository failure', async () => {
		const failure = new Error('db down');
		users.addConnection.mockRejectedValue(failure);

		await expect(service.createConnection(1, dto)).rejects.toBe(failure);
	});
});
