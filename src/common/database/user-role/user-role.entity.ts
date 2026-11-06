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
import { UserAppEntity } from '../user-application/user-app.entity';

@Entity({ name: 'apps_users_roles' })
@Unique(['appUserApplicationId', 'roleId'])
export class UserRoleEntity {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ name: 'app_user_application_id', type: 'int' })
	appUserApplicationId!: number;

	@Column({ name: 'role_id', type: 'int' })
	roleId!: number;

	@CreateDateColumn({ name: 'created_at' })
	createdAt!: Date;

	@UpdateDateColumn({ name: 'updated_at' })
	updatedAt!: Date;

	@ManyToOne(() => UserAppEntity, (userApp) => userApp.roles, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'app_user_application_id' })
	appUserApplication!: UserAppEntity;

	@ManyToOne(() => RoleEntity, (role) => role.appsUsers)
	@JoinColumn({ name: 'role_id' })
	role!: RoleEntity;
}
