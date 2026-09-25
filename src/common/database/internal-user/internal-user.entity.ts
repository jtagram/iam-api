import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'internal_users' })
export class InternalUserEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 15 })
  name!: string;

  @Column({ length: 15 })
  lastname!: string;

  @Column({ length: 30, unique: true })
  email!: string;

  @Column({ length: 60 })
  password!: string;

  static builder(): InternalUserEntityBuilder {
    return new InternalUserEntityBuilder();
  }
}

export class InternalUserEntityBuilder {
  private name?: string;
  private lastname?: string;
  private email?: string;
  private password?: string;

  withName(name: string): this {
    this.name = name;
    return this;
  }

  withLastname(lastname: string): this {
    this.lastname = lastname;
    return this;
  }

  withEmail(email: string): this {
    this.email = email;
    return this;
  }

  withPassword(password: string): this {
    this.password = password;
    return this;
  }

  build(): InternalUserEntity {
    if (this.name === undefined) {
      throw new Error('InternalUserEntity.Builder: name is required');
    }
    if (this.lastname === undefined) {
      throw new Error('InternalUserEntity.Builder: lastname is required');
    }
    if (this.email === undefined) {
      throw new Error('InternalUserEntity.Builder: email is required');
    }
    if (this.password === undefined) {
      throw new Error('InternalUserEntity.Builder: password is required');
    }

    const entity = new InternalUserEntity();
    entity.name = this.name;
    entity.lastname = this.lastname;
    entity.email = this.email;
    entity.password = this.password;
    return entity;
  }
}
