import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { UserAppEntity } from '../../common/database/user-application/user-app.entity';
import { UserRoleEntity } from '../../common/database/user-role/user-role.entity';
import { Role } from '../../common/database/role/role.enum';
import { AssignApplicationDto } from '../../common/dto/assign-application.dto';
import { AssignRoleDto } from '../../common/dto/assign-role.dto';
import { ConnectionResponse } from '../../common/dto/connection-response.dto';
import { CreateConnectionDto } from '../../common/dto/create-connection.dto';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { Roles } from '../../common/guards/roles.decorator';
import { CreateAppUserDto } from './dto/create-app-user.dto';
import { AppUsersService } from './apps-users.service';
import { AppUserCreatedResponse } from './dto/app-user-created-response.dto';
import { AppUserResponse } from './dto/app-user-response.dto';
import { AppUserApplicationRolesResponse } from './dto/app-user-application-roles-response.dto';

@Controller('apps-users')
@Roles(Role.ADMIN)
export class AppUsersController {
  constructor(private readonly appUsersService: AppUsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateAppUserDto,
  ): Promise<ResponseBody<AppUserCreatedResponse>> {
    return this.appUsersService.create(dto);
  }

  @Get()
  findAll(): Promise<ResponseBody<AppUserResponse[]>> {
    return this.appUsersService.findAll();
  }

  @Get(':id/applications')
  findAssignedApplications(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseBody<AppUserApplicationRolesResponse[]>> {
    return this.appUsersService.findAssignedApplications(id);
  }

  @Post(':id/applications')
  @HttpCode(HttpStatus.CREATED)
  assignApplication(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignApplicationDto,
  ): Promise<ResponseBody<UserAppEntity>> {
    return this.appUsersService.assignApplication(id, dto);
  }

  @Post(':id/roles')
  @HttpCode(HttpStatus.CREATED)
  assignRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignRoleDto,
  ): Promise<ResponseBody<UserRoleEntity>> {
    return this.appUsersService.assignRole(id, dto);
  }

  @Get(':id/connections')
  findConnections(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseBody<ConnectionResponse[]>> {
    return this.appUsersService.findConnections(id);
  }

  @Post(':id/connections')
  @HttpCode(HttpStatus.CREATED)
  createConnection(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateConnectionDto,
  ): Promise<ResponseBody<ConnectionResponse>> {
    return this.appUsersService.createConnection(id, dto);
  }
}
