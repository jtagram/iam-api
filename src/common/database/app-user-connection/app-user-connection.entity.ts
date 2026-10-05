import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * One allowed `origin -> destination` application pair for an application
 * user. A user may have several rows with the same origin and different
 * destinations.
 */
@Entity({ name: 'apps_users_connections' })
export class AppUserConnectionEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'app_user_id', type: 'int' })
  appUserId!: number;

  @Column({ name: 'origin_application_id', type: 'int' })
  originApplicationId!: number;

  @Column({ name: 'destination_application_id', type: 'int' })
  destinationApplicationId!: number;
}
