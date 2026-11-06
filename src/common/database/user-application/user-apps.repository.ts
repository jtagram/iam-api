import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserAppEntity } from './user-app.entity';

@Injectable()
export class UserAppsRepository {
	constructor(
		@InjectRepository(UserAppEntity)
		private readonly repository: Repository<UserAppEntity>,
	) {}

	existsForAppUserAndApplication(appUserId: number, applicationId: number): Promise<boolean> {
		return this.repository.exists({ where: { appUserId, applicationId } });
	}
}
