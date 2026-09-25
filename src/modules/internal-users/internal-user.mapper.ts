import { InternalUserEntity } from '../../common/database/internal-user/internal-user.entity';
import { CreateInternalUserDto } from './dto/create-internal-user.dto';
import { InternalUserCreatedResponse } from './dto/internal-user-created-response.dto';

export class InternalUserMapper {
  static toEntity(
    dto: CreateInternalUserDto,
    hashedPassword: string,
  ): InternalUserEntity {
    return InternalUserEntity.builder()
      .withName(dto.name)
      .withLastname(dto.lastname)
      .withEmail(dto.email)
      .withPassword(hashedPassword)
      .build();
  }

  static toCreatedResponse(
    internalUser: InternalUserEntity,
  ): InternalUserCreatedResponse {
    return {
      id: internalUser.id,
      name: internalUser.name,
      lastname: internalUser.lastname,
      email: internalUser.email,
    };
  }

  static toResponse(
    internalUser: InternalUserEntity,
  ): InternalUserCreatedResponse {
    return this.toCreatedResponse(internalUser);
  }
}
