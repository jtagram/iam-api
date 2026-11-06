import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, EntityTarget, FindOneOptions, Repository } from 'typeorm';
import { AppUserConnectionEntity } from '../app-user-connection/app-user-connection.entity';
import { UserAppEntity } from '../user-application/user-app.entity';
import { UserRoleEntity } from '../user-role/user-role.entity';
import { AppUserEntity } from './app-user.entity';

const NEWEST_FIRST = { createdAt: 'DESC', id: 'DESC' } as const;

// The user with its assignment tree: applications, and the roles held in each.
// Newest first for applications and, within each, for roles.
const WITH_APPLICATIONS_AND_ROLES = {
	relations: { applications: { application: true, roles: { role: true } } },
	order: {
		applications: {
			application: NEWEST_FIRST,
			roles: { role: NEWEST_FIRST },
		},
	},
} satisfies FindOneOptions<AppUserEntity>;

// The user with its connections and the two applications of each, newest first.
const WITH_CONNECTIONS = {
	relations: { connections: { originApplication: true, destinationApplication: true } },
	order: { connections: NEWEST_FIRST },
} satisfies FindOneOptions<AppUserEntity>;

@Injectable()
export class AppUsersRepository {
	constructor(
		@InjectRepository(AppUserEntity)
		private readonly repository: Repository<AppUserEntity>,
	) {}

	createAppUser(appUser: AppUserEntity): Promise<AppUserEntity> {
		const entity = this.repository.create(appUser);
		return this.repository.save(entity);
	}

	findByClienteId(clienteId: string): Promise<AppUserEntity | null> {
		return this.repository.findOne({ where: { clienteId } });
	}

	findByName(name: string): Promise<AppUserEntity | null> {
		return this.repository.findOne({ where: { name } });
	}

	findById(id: number): Promise<AppUserEntity | null> {
		return this.repository.findOne({ where: { id } });
	}

	findByIdWithAssignments(id: number): Promise<AppUserEntity | null> {
		return this.repository.findOne({ where: { id }, ...WITH_APPLICATIONS_AND_ROLES });
	}

	findByIdWithConnections(id: number): Promise<AppUserEntity | null> {
		return this.repository.findOne({ where: { id }, ...WITH_CONNECTIONS });
	}

	// The user with only the given connection (and its two applications) in `connections`.
	findByIdWithConnection(appUserId: number, connectionId: number): Promise<AppUserEntity | null> {
		return this.repository.findOne({
			where: { id: appUserId, connections: { id: connectionId } },
			relations: { connections: { originApplication: true, destinationApplication: true } },
		});
	}

	hasConnection(
		appUserId: number,
		originApplicationId: number,
		destinationApplicationId: number,
	): Promise<boolean> {
		return this.repository.exists({
			where: { id: appUserId, connections: { originApplicationId, destinationApplicationId } },
		});
	}

	// The user's assignment of the given application, if any.
	findApplicationAssignment(
		appUserId: number,
		applicationId: number,
	): Promise<UserAppEntity | null> {
		return this.repository.manager
			.getRepository(UserAppEntity)
			.findOne({ where: { appUserId, applicationId } });
	}

	hasApplication(appUserId: number, applicationId: number): Promise<boolean> {
		return this.repository.exists({ where: { id: appUserId, applications: { applicationId } } });
	}

	// Whether the user holds the role, in whichever application assignment it hangs off.
	hasRole(appUserId: number, roleId: number): Promise<boolean> {
		return this.repository.exists({
			where: { id: appUserId, applications: { roles: { roleId } } },
		});
	}

	addApplication(assignment: UserAppEntity): Promise<UserAppEntity> {
		return this.saveChild(UserAppEntity, assignment);
	}

	addRole(roleAssignment: UserRoleEntity): Promise<UserRoleEntity> {
		return this.saveChild(UserRoleEntity, roleAssignment);
	}

	addConnection(connection: AppUserConnectionEntity): Promise<AppUserConnectionEntity> {
		return this.saveChild(AppUserConnectionEntity, connection);
	}

	findAllOrderedByCreatedAtDesc(): Promise<AppUserEntity[]> {
		return this.repository.find({ order: { createdAt: 'DESC' } });
	}

	private saveChild<Child extends object>(
		target: EntityTarget<Child>,
		child: Child,
	): Promise<Child> {
		const childRepository = this.repository.manager.getRepository(target);
		return childRepository.save(childRepository.create(child as DeepPartial<Child>));
	}
}
