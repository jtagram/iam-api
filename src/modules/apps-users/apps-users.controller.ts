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
} from '@nestjs/common';
import { UserAppEntity } from '../../common/database/user-application/user-app.entity';
import { UserRoleEntity } from '../../common/database/user-role/user-role.entity';
import { Role } from '../../common/database/role/role.enum';
import { AssignApplicationDto } from '../../common/dto/assign-application.dto';
import { AssignRoleDto } from '../../common/dto/assign-role.dto';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { ResponseLogin } from '../../common/dto/response-login.dto';
import { Public } from '../../common/guards/public.decorator';
import { Roles } from '../../common/guards/roles.decorator';
import { CreateAppUserDto } from './dto/create-app-user.dto';
import { LoginDto } from './dto/login.dto';
import { AppUsersService } from './apps-users.service';
import { AppUsersLoginService } from './apps-users-login.service';
import { AppUserCreatedResponse } from './dto/app-user-created-response.dto';
import { AppUserResponse } from './dto/app-user-response.dto';

@Controller('apps-users')
export class AppUsersController {
  constructor(
    private readonly appUsersService: AppUsersService,
    private readonly appUsersLoginService: AppUsersLoginService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.ADMIN)
  create(
    @Body() dto: CreateAppUserDto,
  ): Promise<ResponseBody<AppUserCreatedResponse>> {
    return this.appUsersService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN)
  findAll(): Promise<ResponseBody<AppUserResponse[]>> {
    return this.appUsersService.findAll();
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Public()
  login(
    @Body() dto: LoginDto,
    @Headers('x-application-name') applicationName: string,
  ): Promise<ResponseLogin> {
    return this.appUsersLoginService.login(dto, applicationName);
  }

  @Post(':id/applications')
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.ADMIN)
  assignApplication(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignApplicationDto,
  ): Promise<ResponseBody<UserAppEntity>> {
    return this.appUsersService.assignApplication(id, dto);
  }

  @Post(':id/roles')
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.ADMIN)
  assignRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignRoleDto,
  ): Promise<ResponseBody<UserRoleEntity>> {
    return this.appUsersService.assignRole(id, dto);
  }
}
