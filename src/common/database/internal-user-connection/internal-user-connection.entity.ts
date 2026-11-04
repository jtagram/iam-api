import {
	Column,
	CreateDateColumn,
	Entity,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from 'typeorm';

/**
 * One allowed `origin -> destination` application pair for an internal user.
 * A user may have several rows with the same origin and different
 * destinations.
 */
@Entity({ name: 'internal_users_connections' })
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
}
