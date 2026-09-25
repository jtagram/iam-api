import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRoleEntity } from './user-role.entity';

@Injectable()
export class UserRolesRepository {
  constructor(
    @InjectRepository(UserRoleEntity)
    private readonly repository: Repository<UserRoleEntity>,
  ) {}

  findRoleIdsForAppUserAndApplication(
    appUserId: number,
    applicationId: number,
  ): Promise<number[]> {
    return this.repository
      .find({ where: { appUserId, applicationId }, select: { roleId: true } })
      .then((rows) => rows.map((row) => row.roleId));
  }

  createAssignment(entity: UserRoleEntity): Promise<UserRoleEntity> {
    const created = this.repository.create(entity);
    return this.repository.save(created);
  }

  existsForAppUserAndRole(appUserId: number, roleId: number): Promise<boolean> {
    return this.repository.exists({ where: { appUserId, roleId } });
  }

  findAllByAppUserId(appUserId: number): Promise<UserRoleEntity[]> {
    return this.repository.find({ where: { appUserId } });
  }
}
