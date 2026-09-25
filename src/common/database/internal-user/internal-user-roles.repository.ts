import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InternalUserRoleEntity } from './internal-user-role.entity';

@Injectable()
export class InternalUserRolesRepository {
  constructor(
    @InjectRepository(InternalUserRoleEntity)
    private readonly repository: Repository<InternalUserRoleEntity>,
  ) {}

  findRoleIdsForInternalUserAndApplication(
    internalUserId: number,
    applicationId: number,
  ): Promise<number[]> {
    return this.repository
      .find({
        where: { internalUserId, applicationId },
        select: { roleId: true },
      })
      .then((rows) => rows.map((row) => row.roleId));
  }

  createAssignment(
    entity: InternalUserRoleEntity,
  ): Promise<InternalUserRoleEntity> {
    const created = this.repository.create(entity);
    return this.repository.save(created);
  }

  existsForInternalUserAndRole(
    internalUserId: number,
    roleId: number,
  ): Promise<boolean> {
    return this.repository.exists({ where: { internalUserId, roleId } });
  }
}
