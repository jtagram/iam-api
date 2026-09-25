import { AppUserEntity } from '../../common/database/app-user/app-user.entity';
import { CreateAppUserDto } from './dto/create-app-user.dto';
import { AppUserCreatedResponse } from './dto/app-user-created-response.dto';
import { AppUserResponse } from './dto/app-user-response.dto';

export class AppUserMapper {
  static toEntity(
    dto: CreateAppUserDto,
    clienteId: string,
    hashedClienteSecret: string,
  ): AppUserEntity {
    return AppUserEntity.builder()
      .withClienteId(clienteId)
      .withClienteSecret(hashedClienteSecret)
      .withName(dto.name)
      .withDescription(dto.description)
      .build();
  }

  static toCreatedResponse(
    appUser: AppUserEntity,
    plaintextClienteSecret: string,
  ): AppUserCreatedResponse {
    return {
      id: appUser.id,
      clienteId: appUser.clienteId,
      clienteSecret: plaintextClienteSecret,
      name: appUser.name,
      description: appUser.description,
    };
  }

  static toResponse(appUser: AppUserEntity): AppUserResponse {
    return {
      id: appUser.id,
      clienteId: appUser.clienteId,
      name: appUser.name,
      description: appUser.description,
    };
  }
}
