import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'internal_users_roles' })
export class InternalUserRoleEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'internal_user_id', type: 'int' })
  internalUserId!: number;

  @Column({ name: 'application_id', type: 'int' })
  applicationId!: number;

  @Column({ name: 'role_id', type: 'int' })
  roleId!: number;
}
