import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ApplicationEntity } from './application.entity';

@Injectable()
export class ApplicationsRepository {
	constructor(
		@InjectRepository(ApplicationEntity)
		private readonly repository: Repository<ApplicationEntity>,
	) {}

	createApplication(application: ApplicationEntity): Promise<ApplicationEntity> {
		const entity = this.repository.create(application);
		return this.repository.save(entity);
	}

	findById(id: number): Promise<ApplicationEntity | null> {
		return this.repository.findOne({ where: { id } });
	}

	findAllOrderedByCreatedAtDesc(): Promise<ApplicationEntity[]> {
		return this.repository.find({ order: { createdAt: 'DESC' } });
	}

	/** Every application with all its roles, both most recently created first. */
	findAllWithRolesOrderedByCreatedAtDesc(): Promise<ApplicationEntity[]> {
		return this.repository
			.createQueryBuilder('application')
			.leftJoinAndSelect('application.roles', 'role')
			.orderBy('application.createdAt', 'DESC')
			.addOrderBy('application.id', 'DESC')
			.addOrderBy('role.createdAt', 'DESC')
			.addOrderBy('role.id', 'DESC')
			.getMany();
	}

	findByName(name: string): Promise<ApplicationEntity | null> {
		return this.repository.findOne({ where: { name } });
	}

	findByIds(ids: number[]): Promise<ApplicationEntity[]> {
		if (ids.length === 0) {
			return Promise.resolve([]);
		}
		return this.repository.find({ where: { id: In(ids) } });
	}
}
