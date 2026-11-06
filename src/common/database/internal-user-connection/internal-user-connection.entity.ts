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
import { InternalUserEntity } from '../internal-user/internal-user.entity';

/**
 * One allowed `origin -> destination` application pair for an internal user.
 * A user may have several rows with the same origin and different
 * destinations.
 */
@Entity({ name: 'internal_users_connections' })
@Unique(['internalUserId', 'originApplicationId', 'destinationApplicationId'])
export class InternalUserConnectionEntity {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ name: 'internal_user_id', type: 'int' })
	internalUserId!: number;

	@Column({ name: 'origin_application_id', type: 'int' })
	originApplicationId!: number;

	@Column({ name: 'destination_application_id', type: 'int' })
	destinationApplicationId!: number;

	@CreateDateColumn({ name: 'created_at' })
	createdAt!: Date;

	@UpdateDateColumn({ name: 'updated_at' })
	updatedAt!: Date;

	@ManyToOne(() => InternalUserEntity, (internalUser) => internalUser.connections)
	@JoinColumn({ name: 'internal_user_id' })
	internalUser!: InternalUserEntity;

	@ManyToOne(() => ApplicationEntity)
	@JoinColumn({ name: 'origin_application_id' })
	originApplication!: ApplicationEntity;

	@ManyToOne(() => ApplicationEntity)
	@JoinColumn({ name: 'destination_application_id' })
	destinationApplication!: ApplicationEntity;
}
