import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'internal_users_applications' })
export class InternalUserAppEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'internal_user_id', type: 'int' })
  internalUserId!: number;

  @Column({ name: 'application_id', type: 'int' })
  applicationId!: number;
}
