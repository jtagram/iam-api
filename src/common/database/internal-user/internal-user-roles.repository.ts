import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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

  findAllByInternalUserId(
    internalUserId: number,
  ): Promise<InternalUserRoleEntity[]> {
    return this.repository.find({ where: { internalUserId } });
  }

  async findInternalUserIdsByRoleIds(roleIds: number[]): Promise<number[]> {
    if (roleIds.length === 0) {
      return [];
    }
    const rows = await this.repository.find({
      where: { roleId: In(roleIds) },
      select: { internalUserId: true },
    });
    return [...new Set(rows.map((row) => row.internalUserId))];
  }
}
