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

  findById(id: number): Promise<AppUserEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  findAll(): Promise<AppUserEntity[]> {
    return this.repository.find();
  }
}
