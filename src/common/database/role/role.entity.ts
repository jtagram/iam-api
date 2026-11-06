import {
	Column,
	CreateDateColumn,
	Entity,
	JoinColumn,
	ManyToOne,
	OneToMany,
	PrimaryGeneratedColumn,
	Unique,
	UpdateDateColumn,
} from 'typeorm';
import { ApplicationEntity } from '../application/application.entity';
import { InternalUserRoleEntity } from '../internal-user/internal-user-role.entity';
import { UserRoleEntity } from '../user-role/user-role.entity';

@Entity({ name: 'apps_roles' })
@Unique(['applicationId', 'name'])
export class RoleEntity {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ name: 'application_id', type: 'int' })
	applicationId!: number;

	@Column({ length: 30 })
	name!: string;

	@Column({ length: 200 })
	description!: string;

	@CreateDateColumn({ name: 'created_at' })
	createdAt!: Date;

	@UpdateDateColumn({ name: 'updated_at' })
	updatedAt!: Date;

	@ManyToOne(() => ApplicationEntity, (application) => application.roles)
	@JoinColumn({ name: 'application_id' })
	application!: ApplicationEntity;

	@OneToMany(() => UserRoleEntity, (userRole) => userRole.role)
	appsUsers!: UserRoleEntity[];

	@OneToMany(() => InternalUserRoleEntity, (internalUserRole) => internalUserRole.role)
	internalUsers!: InternalUserRoleEntity[];

	static builder(): RoleEntityBuilder {
		return new RoleEntityBuilder();
	}
}

export class RoleEntityBuilder {
	private applicationId?: number;
	private name?: string;
	private description?: string;

	withApplicationId(applicationId: number): this {
		this.applicationId = applicationId;
		return this;
	}

	withName(name: string): this {
		this.name = name;
		return this;
	}

	withDescription(description: string): this {
		this.description = description;
		return this;
	}

	build(): RoleEntity {
		if (this.applicationId === undefined) {
			throw new Error('RoleEntity.Builder: applicationId is required');
		}
		if (this.name === undefined) {
			throw new Error('RoleEntity.Builder: name is required');
		}
		if (this.description === undefined) {
			throw new Error('RoleEntity.Builder: description is required');
		}

		const entity = new RoleEntity();
		entity.applicationId = this.applicationId;
		entity.name = this.name;
		entity.description = this.description;
		return entity;
	}
}
