import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity({ name: 'apps_roles' })
@Unique(['applicationId', 'name'])
export class RoleEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'application_id', type: 'int' })
  applicationId!: number;

  @Column({ length: 30 })
  name!: string;

  @Column({ length: 200 })
  description!: string;

  static builder(): RoleEntityBuilder {
    return new RoleEntityBuilder();
  }
}

export class RoleEntityBuilder {
  private applicationId?: number;
  private name?: string;
  private description?: string;

  withApplicationId(applicationId: number): this {
    this.applicationId = applicationId;
    return this;
  }

  withName(name: string): this {
    this.name = name;
    return this;
  }

  withDescription(description: string): this {
    this.description = description;
    return this;
  }

  build(): RoleEntity {
    if (this.applicationId === undefined) {
      throw new Error('RoleEntity.Builder: applicationId is required');
    }
    if (this.name === undefined) {
      throw new Error('RoleEntity.Builder: name is required');
    }
    if (this.description === undefined) {
      throw new Error('RoleEntity.Builder: description is required');
    }

    const entity = new RoleEntity();
    entity.applicationId = this.applicationId;
    entity.name = this.name;
    entity.description = this.description;
    return entity;
  }
}
