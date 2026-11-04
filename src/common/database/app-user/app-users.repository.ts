import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppUserEntity } from './app-user.entity';

@Injectable()
export class AppUsersRepository {
	constructor(
		@InjectRepository(AppUserEntity)
		private readonly repository: Repository<AppUserEntity>,
	) {}

	createAppUser(appUser: AppUserEntity): Promise<AppUserEntity> {
		const entity = this.repository.create(appUser);
		return this.repository.save(entity);
	}

	findByClienteId(clienteId: string): Promise<AppUserEntity | null> {
		return this.repository.findOne({ where: { clienteId } });
	}

	findByName(name: string): Promise<AppUserEntity | null> {
		return this.repository.findOne({ where: { name } });
	}

	findById(id: number): Promise<AppUserEntity | null> {
		return this.repository.findOne({ where: { id } });
	}

	findAllOrderedByCreatedAtDesc(): Promise<AppUserEntity[]> {
		return this.repository.find({ order: { createdAt: 'DESC' } });
	}
}
