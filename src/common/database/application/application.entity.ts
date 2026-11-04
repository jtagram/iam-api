import {
	Column,
	CreateDateColumn,
	Entity,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from 'typeorm';

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
