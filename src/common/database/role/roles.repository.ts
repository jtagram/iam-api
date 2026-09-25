import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RoleEntity } from './role.entity';

@Injectable()
export class RolesRepository {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly repository: Repository<RoleEntity>,
  ) {}

  createRole(role: RoleEntity): Promise<RoleEntity> {
    const entity = this.repository.create(role);
    return this.repository.save(entity);
  }

  findById(id: number): Promise<RoleEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  findAllByApplicationId(applicationId: number): Promise<RoleEntity[]> {
    return this.repository.find({ where: { applicationId } });
  }

  findByIds(ids: number[]): Promise<RoleEntity[]> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }
    return this.repository.find({ where: { id: In(ids) } });
  }
}
