import {
	Column,
	CreateDateColumn,
	Entity,
	OneToMany,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from 'typeorm';
import { InternalUserAppEntity } from '../internal-user/internal-user-app.entity';
import { RoleEntity } from '../role/role.entity';
import { UserAppEntity } from '../user-application/user-app.entity';

@Entity({ name: 'apps_applications' })
export class ApplicationEntity {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ length: 30, unique: true })
	name!: string;

	@Column({ length: 200 })
	description!: string;

	@CreateDateColumn({ name: 'created_at' })
	createdAt!: Date;

	@UpdateDateColumn({ name: 'updated_at' })
	updatedAt!: Date;

	@OneToMany(() => RoleEntity, (role) => role.application)
	roles!: RoleEntity[];

	@OneToMany(() => UserAppEntity, (userApp) => userApp.application)
	appsUsers!: UserAppEntity[];

	@OneToMany(() => InternalUserAppEntity, (internalUserApp) => internalUserApp.application)
	internalUsers!: InternalUserAppEntity[];

	static builder(): ApplicationEntityBuilder {
		return new ApplicationEntityBuilder();
	}
}

export class ApplicationEntityBuilder {
	private name?: string;
	private description?: string;

	withName(name: string): this {
		this.name = name;
		return this;
	}

	withDescription(description: string): this {
		this.description = description;
		return this;
	}

	build(): ApplicationEntity {
		if (this.name === undefined) {
			throw new Error('ApplicationEntity.Builder: name is required');
		}
		if (this.description === undefined) {
			throw new Error('ApplicationEntity.Builder: description is required');
		}

		const entity = new ApplicationEntity();
		entity.name = this.name;
		entity.description = this.description;
		return entity;
	}
}
