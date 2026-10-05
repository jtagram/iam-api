import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InternalUserConnectionEntity } from './internal-user-connection.entity';

@Injectable()
export class InternalUserConnectionsRepository {
  constructor(
    @InjectRepository(InternalUserConnectionEntity)
    private readonly repository: Repository<InternalUserConnectionEntity>,
  ) {}

  createConnection(
    entity: InternalUserConnectionEntity,
  ): Promise<InternalUserConnectionEntity> {
    const created = this.repository.create(entity);
    return this.repository.save(created);
  }

  existsForInternalUserAndApplications(
    internalUserId: number,
    originApplicationId: number,
    destinationApplicationId: number,
  ): Promise<boolean> {
    return this.repository.exists({
      where: { internalUserId, originApplicationId, destinationApplicationId },
    });
  }

  findAllByInternalUserId(
    internalUserId: number,
  ): Promise<InternalUserConnectionEntity[]> {
    return this.repository.find({
      where: { internalUserId },
      order: { id: 'ASC' },
    });
  }
}
