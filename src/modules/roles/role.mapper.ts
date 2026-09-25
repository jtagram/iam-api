import { RoleEntity } from '../../common/database/role/role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { RoleResponse } from './dto/role-response.dto';

export class RoleMapper {
  static toEntity(dto: CreateRoleDto): RoleEntity {
    return RoleEntity.builder()
      .withApplicationId(dto.applicationId)
      .withName(dto.name)
      .withDescription(dto.description)
      .build();
  }

  static toResponse(role: RoleEntity): RoleResponse {
    return {
      id: role.id,
      applicationId: role.applicationId,
      name: role.name,
      description: role.description,
    };
  }
}
