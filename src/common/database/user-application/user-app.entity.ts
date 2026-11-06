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
import { AppUserEntity } from '../app-user/app-user.entity';
import { UserRoleEntity } from '../user-role/user-role.entity';

@Entity({ name: 'apps_users_applications' })
@Unique(['appUserId', 'applicationId'])
export class UserAppEntity {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ name: 'app_user_id', type: 'int' })
	appUserId!: number;

	@Column({ name: 'application_id', type: 'int' })
	applicationId!: number;

	@CreateDateColumn({ name: 'created_at' })
	createdAt!: Date;

	@UpdateDateColumn({ name: 'updated_at' })
	updatedAt!: Date;

	@ManyToOne(() => AppUserEntity, (appUser) => appUser.applications)
	@JoinColumn({ name: 'app_user_id' })
	appUser!: AppUserEntity;

	@ManyToOne(() => ApplicationEntity, (application) => application.appsUsers)
	@JoinColumn({ name: 'application_id' })
	application!: ApplicationEntity;

	@OneToMany(() => UserRoleEntity, (userRole) => userRole.appUserApplication)
	roles!: UserRoleEntity[];
}
