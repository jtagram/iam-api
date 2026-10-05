import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppUserConnectionEntity } from './app-user-connection.entity';

@Injectable()
export class AppUserConnectionsRepository {
  constructor(
    @InjectRepository(AppUserConnectionEntity)
    private readonly repository: Repository<AppUserConnectionEntity>,
  ) {}

  createConnection(
    entity: AppUserConnectionEntity,
  ): Promise<AppUserConnectionEntity> {
    const created = this.repository.create(entity);
    return this.repository.save(created);
  }

  existsForAppUserAndApplications(
    appUserId: number,
    originApplicationId: number,
    destinationApplicationId: number,
  ): Promise<boolean> {
    return this.repository.exists({
      where: { appUserId, originApplicationId, destinationApplicationId },
    });
  }

  findAllByAppUserId(appUserId: number): Promise<AppUserConnectionEntity[]> {
    return this.repository.find({
      where: { appUserId },
      order: { id: 'ASC' },
    });
  }
}
