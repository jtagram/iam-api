import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { InternalUserEntity } from './internal-user.entity';

@Injectable()
export class InternalUsersRepository {
  constructor(
    @InjectRepository(InternalUserEntity)
    private readonly repository: Repository<InternalUserEntity>,
  ) {}

  createInternalUser(
    internalUser: InternalUserEntity,
  ): Promise<InternalUserEntity> {
    const entity = this.repository.create(internalUser);
    return this.repository.save(entity);
  }

  findByEmail(email: string): Promise<InternalUserEntity | null> {
    return this.repository.findOne({ where: { email } });
  }

  findById(id: number): Promise<InternalUserEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  findAll(): Promise<InternalUserEntity[]> {
    return this.repository.find();
  }

  findByIds(ids: number[]): Promise<InternalUserEntity[]> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }
    return this.repository.find({ where: { id: In(ids) } });
  }
}
