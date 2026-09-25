import { Injectable, NotFoundException } from '@nestjs/common';
import { ApplicationsRepository } from '../../common/database/application/applications.repository';
import { RolesRepository } from '../../common/database/role/roles.repository';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { FindRolesQueryDto } from './dto/find-roles-query.dto';
import { RoleMapper } from './role.mapper';
import { RoleResponse } from './dto/role-response.dto';

const APPLICATION_NOT_FOUND_MESSAGE = 'Application not found';

@Injectable()
export class RolesService {
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly applicationsRepository: ApplicationsRepository,
  ) {}

  async create(dto: CreateRoleDto): Promise<ResponseBody<RoleResponse>> {
    const application = await this.applicationsRepository.findById(
      dto.applicationId,
    );
    if (!application) {
      throw new NotFoundException(APPLICATION_NOT_FOUND_MESSAGE);
    }

    const roleEntity = RoleMapper.toEntity(dto);
    const createdRole = await this.rolesRepository.createRole(roleEntity);

    return ResponseBody.builder<RoleResponse>()
      .withMsg('Role created successfully')
      .withData(RoleMapper.toResponse(createdRole))
      .build();
  }

  async findAllByApplicationId(
    query: FindRolesQueryDto,
  ): Promise<ResponseBody<RoleResponse[]>> {
    const application = await this.applicationsRepository.findById(
      query.applicationId,
    );
    if (!application) {
      throw new NotFoundException(APPLICATION_NOT_FOUND_MESSAGE);
    }

    const roles = await this.rolesRepository.findAllByApplicationId(
      query.applicationId,
    );

    return ResponseBody.builder<RoleResponse[]>()
      .withMsg('Roles retrieved successfully')
      .withData(roles.map((role) => RoleMapper.toResponse(role)))
      .build();
  }
}
