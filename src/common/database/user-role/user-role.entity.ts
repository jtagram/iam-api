import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'apps_users_roles' })
export class UserRoleEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'app_user_id', type: 'int' })
  appUserId!: number;

  @Column({ name: 'application_id', type: 'int' })
  applicationId!: number;

  @Column({ name: 'role_id', type: 'int' })
  roleId!: number;
}
