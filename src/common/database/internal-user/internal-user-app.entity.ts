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
import { InternalUserRoleEntity } from './internal-user-role.entity';
import { InternalUserEntity } from './internal-user.entity';

@Entity({ name: 'internal_users_applications' })
@Unique(['internalUserId', 'applicationId'])
export class InternalUserAppEntity {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ name: 'internal_user_id', type: 'int' })
	internalUserId!: number;

	@Column({ name: 'application_id', type: 'int' })
	applicationId!: number;

	@CreateDateColumn({ name: 'created_at' })
	createdAt!: Date;

	@UpdateDateColumn({ name: 'updated_at' })
	updatedAt!: Date;

	@ManyToOne(() => InternalUserEntity, (internalUser) => internalUser.applications)
	@JoinColumn({ name: 'internal_user_id' })
	internalUser!: InternalUserEntity;

	@ManyToOne(() => ApplicationEntity, (application) => application.internalUsers)
	@JoinColumn({ name: 'application_id' })
	application!: ApplicationEntity;

	@OneToMany(
		() => InternalUserRoleEntity,
		(internalUserRole) => internalUserRole.internalUserApplication,
	)
	roles!: InternalUserRoleEntity[];
}
