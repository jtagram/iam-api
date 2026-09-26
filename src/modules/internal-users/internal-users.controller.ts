import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { InternalUserAppEntity } from '../../common/database/internal-user/internal-user-app.entity';
import { InternalUserRoleEntity } from '../../common/database/internal-user/internal-user-role.entity';
import { Role } from '../../common/database/role/role.enum';
import { AssignApplicationDto } from '../../common/dto/assign-application.dto';
import { AssignRoleDto } from '../../common/dto/assign-role.dto';
import { Public } from '../../common/guards/public.decorator';
import { Roles } from '../../common/guards/roles.decorator';
import { InternalUsersService } from './internal-users.service';
import { InternalUsersLoginService } from './internal-users-login.service';
import { CreateInternalUserDto } from './dto/create-internal-user.dto';
import { LoginInternalUserDto } from './dto/login-internal-user.dto';
import { InternalUserCreatedResponse } from './dto/internal-user-created-response.dto';
import { InternalUserApplicationRolesResponse } from './dto/internal-user-application-roles-response.dto';
import { FindInternalUsersByRoleDto } from './dto/find-internal-users-by-role.dto';
import { ResponseLogin } from '../../common/dto/response-login.dto';

@Controller('internal-users')
export class InternalUsersController {
  constructor(
    private readonly internalUsersService: InternalUsersService,
    private readonly internalUsersLoginService: InternalUsersLoginService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.ADMIN)
  create(
    @Body() dto: CreateInternalUserDto,
  ): Promise<InternalUserCreatedResponse> {
    return this.internalUsersService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN)
  findAll(): Promise<InternalUserCreatedResponse[]> {
    return this.internalUsersService.findAll();
  }

  @Get('by-role')
  @Public()
  findByApplicationAndRoles(
    @Query() query: FindInternalUsersByRoleDto,
  ): Promise<InternalUserCreatedResponse[]> {
    return this.internalUsersService.findByApplicationAndRoles(query);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Public()
  login(
    @Body() dto: LoginInternalUserDto,
    @Headers('x-application-name') applicationName: string,
  ): Promise<ResponseLogin> {
    return this.internalUsersLoginService.login(dto, applicationName);
  }

  @Get(':id/applications')
  @Roles(Role.ADMIN)
  findAssignedApplications(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<InternalUserApplicationRolesResponse[]> {
    return this.internalUsersService.findAssignedApplications(id);
  }

  @Post(':id/applications')
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.ADMIN)
  assignApplication(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignApplicationDto,
  ): Promise<InternalUserAppEntity> {
    return this.internalUsersService.assignApplication(id, dto);
  }

  @Post(':id/roles')
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.ADMIN)
  assignRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignRoleDto,
  ): Promise<InternalUserRoleEntity> {
    return this.internalUsersService.assignRole(id, dto);
  }
}
