import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { Role } from '../../common/database/role/role.enum';
import { Roles } from '../../common/guards/roles.decorator';
import { CreateRoleDto } from './dto/create-role.dto';
import { FindRolesQueryDto } from './dto/find-roles-query.dto';
import { RolesService } from './roles.service';
import { RoleResponse } from './dto/role-response.dto';

@Controller('roles')
@Roles(Role.ADMIN)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateRoleDto): Promise<ResponseBody<RoleResponse>> {
    return this.rolesService.create(dto);
  }

  @Get()
  findAll(
    @Query() query: FindRolesQueryDto,
  ): Promise<ResponseBody<RoleResponse[]>> {
    return this.rolesService.findAllByApplicationId(query);
  }
}
