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

	existsForInternalUserAndApplication(
		internalUserId: number,
		applicationId: number,
	): Promise<boolean> {
		return this.repository.exists({
			where: { internalUserId, applicationId },
		});
	}
}
