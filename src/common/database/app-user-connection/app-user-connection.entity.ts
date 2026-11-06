import {
	Column,
	CreateDateColumn,
	Entity,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
	Unique,
	UpdateDateColumn,
} from 'typeorm';
import { ApplicationEntity } from '../application/application.entity';
import { AppUserEntity } from '../app-user/app-user.entity';

/**
 * One allowed `origin -> destination` application pair for an application
 * user. A user may have several rows with the same origin and different
 * destinations.
 */
@Entity({ name: 'apps_users_connections' })
@Unique(['appUserId', 'originApplicationId', 'destinationApplicationId'])
export class AppUserConnectionEntity {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ name: 'app_user_id', type: 'int' })
	appUserId!: number;

	@Column({ name: 'origin_application_id', type: 'int' })
	originApplicationId!: number;

	@Column({ name: 'destination_application_id', type: 'int' })
	destinationApplicationId!: number;

	@CreateDateColumn({ name: 'created_at' })
	createdAt!: Date;

	@UpdateDateColumn({ name: 'updated_at' })
	updatedAt!: Date;

	@ManyToOne(() => AppUserEntity, (appUser) => appUser.connections)
	@JoinColumn({ name: 'app_user_id' })
	appUser!: AppUserEntity;

	@ManyToOne(() => ApplicationEntity)
	@JoinColumn({ name: 'origin_application_id' })
	originApplication!: ApplicationEntity;

	@ManyToOne(() => ApplicationEntity)
	@JoinColumn({ name: 'destination_application_id' })
	destinationApplication!: ApplicationEntity;
}
