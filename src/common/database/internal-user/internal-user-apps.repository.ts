import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InternalUserAppEntity } from './internal-user-app.entity';

@Injectable()
export class InternalUserAppsRepository {
  constructor(
    @InjectRepository(InternalUserAppEntity)
    private readonly repository: Repository<InternalUserAppEntity>,
  ) {}

  createAssignment(
    entity: InternalUserAppEntity,
  ): Promise<InternalUserAppEntity> {
    const created = this.repository.create(entity);
    return this.repository.save(created);
  }

  existsForInternalUserAndApplication(
    internalUserId: number,
    applicationId: number,
  ): Promise<boolean> {
    return this.repository.exists({
      where: { internalUserId, applicationId },
    });
  }
}
