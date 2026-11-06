import { Exclude } from 'class-transformer';
import {
	Column,
	CreateDateColumn,
	Entity,
	OneToMany,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from 'typeorm';
import { AppUserConnectionEntity } from '../app-user-connection/app-user-connection.entity';
import { UserAppEntity } from '../user-application/user-app.entity';

@Entity({ name: 'apps_users' })
export class AppUserEntity {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ name: 'cliente_id', length: 30, unique: true })
	clienteId!: string;

	// Never serialized: the global ClassSerializerInterceptor drops it from every HTTP response.
	@Exclude({ toPlainOnly: true })
	@Column({ name: 'cliente_secret', length: 60 })
	clienteSecret!: string;

	@Column({ length: 30 })
	name!: string;

	@Column({ length: 200 })
	description!: string;

	@CreateDateColumn({ name: 'created_at' })
	createdAt!: Date;

	@UpdateDateColumn({ name: 'updated_at' })
	updatedAt!: Date;

	@OneToMany(() => UserAppEntity, (userApp) => userApp.appUser)
	applications!: UserAppEntity[];

	@OneToMany(() => AppUserConnectionEntity, (connection) => connection.appUser)
	connections!: AppUserConnectionEntity[];

	static builder(): AppUserEntityBuilder {
		return new AppUserEntityBuilder();
	}
}

export class AppUserEntityBuilder {
	private clienteId?: string;
	private clienteSecret?: string;
	private name?: string;
	private description?: string;

	withClienteId(clienteId: string): this {
		this.clienteId = clienteId;
		return this;
	}

	withClienteSecret(clienteSecret: string): this {
		this.clienteSecret = clienteSecret;
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

	build(): AppUserEntity {
		if (this.clienteId === undefined) {
			throw new Error('AppUserEntity.Builder: clienteId is required');
		}
		if (this.clienteSecret === undefined) {
			throw new Error('AppUserEntity.Builder: clienteSecret is required');
		}
		if (this.name === undefined) {
			throw new Error('AppUserEntity.Builder: name is required');
		}
		if (this.description === undefined) {
			throw new Error('AppUserEntity.Builder: description is required');
		}

		const entity = new AppUserEntity();
		entity.clienteId = this.clienteId;
		entity.clienteSecret = this.clienteSecret;
		entity.name = this.name;
		entity.description = this.description;
		return entity;
	}
}
