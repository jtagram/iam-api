import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InternalUserAppEntity } from '../../common/database/internal-user/internal-user-app.entity';
import { InternalUserRoleEntity } from '../../common/database/internal-user/internal-user-role.entity';
import { Role } from '../../common/database/role/role.enum';
import { AssignApplicationDto } from '../../common/dto/assign-application.dto';
import { AssignRoleDto } from '../../common/dto/assign-role.dto';
import { ConnectionResponse } from '../../common/dto/connection-response.dto';
import { CreateConnectionDto } from '../../common/dto/create-connection.dto';
import { Roles } from '../../common/guards/roles.decorator';
import { InternalUsersService } from './internal-users.service';
import { CreateInternalUserDto } from './dto/create-internal-user.dto';
import { InternalUserCreatedResponse } from './dto/internal-user-created-response.dto';
import { InternalUserApplicationRolesResponse } from './dto/internal-user-application-roles-response.dto';
import { FindInternalUsersByRoleDto } from './dto/find-internal-users-by-role.dto';
import {
  ApiCreateInternalUser,
  ApiFindAllInternalUsers,
  ApiFindInternalUsersByRole,
  ApiFindInternalUserApplications,
  ApiAssignInternalUserApplication,
  ApiAssignInternalUserRole,
  ApiFindInternalUserConnections,
  ApiCreateInternalUserConnection,
} from './internal-users.swagger';

@ApiTags('Internal users')
@Controller('internal-users')
@Roles(Role.ADMIN)
export class InternalUsersController {
  constructor(private readonly internalUsersService: InternalUsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateInternalUser()
  create(
    @Body() dto: CreateInternalUserDto,
  ): Promise<InternalUserCreatedResponse> {
    return this.internalUsersService.create(dto);
  }

  @Get()
  @ApiFindAllInternalUsers()
  findAll(): Promise<InternalUserCreatedResponse[]> {
    return this.internalUsersService.findAll();
  }

  @Get('by-role')
  @ApiFindInternalUsersByRole()
  findByApplicationAndRoles(
    @Query() query: FindInternalUsersByRoleDto,
  ): Promise<InternalUserCreatedResponse[]> {
    return this.internalUsersService.findByApplicationAndRoles(query);
  }

  @Get(':id/applications')
  @ApiFindInternalUserApplications()
  findAssignedApplications(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<InternalUserApplicationRolesResponse[]> {
    return this.internalUsersService.findAssignedApplications(id);
  }

  @Post(':id/applications')
  @HttpCode(HttpStatus.CREATED)
  @ApiAssignInternalUserApplication()
  assignApplication(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignApplicationDto,
  ): Promise<InternalUserAppEntity> {
    return this.internalUsersService.assignApplication(id, dto);
  }

  @Post(':id/roles')
  @HttpCode(HttpStatus.CREATED)
  @ApiAssignInternalUserRole()
  assignRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignRoleDto,
  ): Promise<InternalUserRoleEntity> {
    return this.internalUsersService.assignRole(id, dto);
  }

  @Get(':id/connections')
  @ApiFindInternalUserConnections()
  findConnections(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ConnectionResponse[]> {
    return this.internalUsersService.findConnections(id);
  }

  @Post(':id/connections')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateInternalUserConnection()
  createConnection(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateConnectionDto,
  ): Promise<ConnectionResponse> {
    return this.internalUsersService.createConnection(id, dto);
  }
}
