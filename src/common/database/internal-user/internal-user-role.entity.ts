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
import { RoleEntity } from '../role/role.entity';
import { InternalUserAppEntity } from './internal-user-app.entity';

@Entity({ name: 'internal_users_roles' })
@Unique(['internalUserApplicationId', 'roleId'])
export class InternalUserRoleEntity {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ name: 'internal_user_application_id', type: 'int' })
	internalUserApplicationId!: number;

	@Column({ name: 'role_id', type: 'int' })
	roleId!: number;

	@CreateDateColumn({ name: 'created_at' })
	createdAt!: Date;

	@UpdateDateColumn({ name: 'updated_at' })
	updatedAt!: Date;

	@ManyToOne(() => InternalUserAppEntity, (internalUserApp) => internalUserApp.roles, {
		onDelete: 'CASCADE',
	})
	@JoinColumn({ name: 'internal_user_application_id' })
	internalUserApplication!: InternalUserAppEntity;

	@ManyToOne(() => RoleEntity, (role) => role.internalUsers)
	@JoinColumn({ name: 'role_id' })
	role!: RoleEntity;
}
