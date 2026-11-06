import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, EntityTarget, FindManyOptions, In, Repository } from 'typeorm';
import { InternalUserConnectionEntity } from '../internal-user-connection/internal-user-connection.entity';
import { InternalUserAppEntity } from './internal-user-app.entity';
import { InternalUserRoleEntity } from './internal-user-role.entity';
import { InternalUserEntity } from './internal-user.entity';

const NEWEST_FIRST = { createdAt: 'DESC', id: 'DESC' } as const;

// Users with their whole assignment tree: applications, and the roles held in
// each. Newest first at every level (users, applications, roles of an
// application), the same order as the catalog endpoints.
const WITH_APPLICATIONS_AND_ROLES = {
	relations: { applications: { application: true, roles: { role: true } } },
	order: {
		...NEWEST_FIRST,
		applications: {
			application: NEWEST_FIRST,
			roles: { role: NEWEST_FIRST },
		},
	},
} satisfies FindManyOptions<InternalUserEntity>;

// Users with their connections and the two applications of each, newest first.
const WITH_CONNECTIONS = {
	relations: { connections: { originApplication: true, destinationApplication: true } },
	order: { connections: NEWEST_FIRST },
} satisfies FindManyOptions<InternalUserEntity>;

@Injectable()
export class InternalUsersRepository {
	constructor(
		@InjectRepository(InternalUserEntity)
		private readonly repository: Repository<InternalUserEntity>,
	) {}

	createInternalUser(internalUser: InternalUserEntity): Promise<InternalUserEntity> {
		const entity = this.repository.create(internalUser);
		return this.repository.save(entity);
	}

	findByEmail(email: string): Promise<InternalUserEntity | null> {
		return this.repository.findOne({ where: { email } });
	}

	findById(id: number): Promise<InternalUserEntity | null> {
		return this.repository.findOne({ where: { id } });
	}

	/**
	 * The user with its assignment tree: each assigned application with the roles
	 * held in it, newest first at every level.
	 */
	findByIdWithAssignments(id: number): Promise<InternalUserEntity | null> {
		return this.repository.findOne({ where: { id }, ...WITH_APPLICATIONS_AND_ROLES });
	}

	/**
	 * The user with its connections (both applications loaded), newest first.
	 */
	findByIdWithConnections(id: number): Promise<InternalUserEntity | null> {
		return this.repository.findOne({ where: { id }, ...WITH_CONNECTIONS });
	}

	// The user with only the given connection (and its two applications) in `connections`.
	findByIdWithConnection(
		internalUserId: number,
		connectionId: number,
	): Promise<InternalUserEntity | null> {
		return this.repository.findOne({
			where: { id: internalUserId, connections: { id: connectionId } },
			relations: { connections: { originApplication: true, destinationApplication: true } },
		});
	}

	hasConnection(
		internalUserId: number,
		originApplicationId: number,
		destinationApplicationId: number,
	): Promise<boolean> {
		return this.repository.exists({
			where: { id: internalUserId, connections: { originApplicationId, destinationApplicationId } },
		});
	}

	// The user's assignment of the given application, if any.
	findApplicationAssignment(
		internalUserId: number,
		applicationId: number,
	): Promise<InternalUserAppEntity | null> {
		return this.repository.manager
			.getRepository(InternalUserAppEntity)
			.findOne({ where: { internalUserId, applicationId } });
	}

	hasApplication(internalUserId: number, applicationId: number): Promise<boolean> {
		return this.repository.exists({
			where: { id: internalUserId, applications: { applicationId } },
		});
	}

	// Whether the user holds the role, in whichever application assignment it hangs off.
	hasRole(internalUserId: number, roleId: number): Promise<boolean> {
		return this.repository.exists({
			where: { id: internalUserId, applications: { roles: { roleId } } },
		});
	}

	addApplication(assignment: InternalUserAppEntity): Promise<InternalUserAppEntity> {
		return this.saveChild(InternalUserAppEntity, assignment);
	}

	addRole(roleAssignment: InternalUserRoleEntity): Promise<InternalUserRoleEntity> {
		return this.saveChild(InternalUserRoleEntity, roleAssignment);
	}

	addConnection(connection: InternalUserConnectionEntity): Promise<InternalUserConnectionEntity> {
		return this.saveChild(InternalUserConnectionEntity, connection);
	}

	/**
	 * The users holding at least one of the given roles in the given application,
	 * newest first. Only filters through the assignments: none are loaded.
	 */
	findByApplicationAndRoleNames(
		applicationName: string,
		roleNames: string[],
	): Promise<InternalUserEntity[]> {
		if (roleNames.length === 0) {
			return Promise.resolve([]);
		}
		return this.repository.find({
			where: {
				applications: {
					application: { name: applicationName },
					roles: { role: { name: In(roleNames) } },
				},
			},
			order: NEWEST_FIRST,
		});
	}

	findAllWithApplicationsOrderedByCreatedAtDesc(): Promise<InternalUserEntity[]> {
		return this.repository.find(WITH_APPLICATIONS_AND_ROLES);
	}

	findAllOrderedByCreatedAtDesc(): Promise<InternalUserEntity[]> {
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
