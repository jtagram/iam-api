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
import { ApiTags } from '@nestjs/swagger';
import { AppUserEntity } from '../../common/database/app-user/app-user.entity';
import { Role } from '../../common/database/role/role.enum';
import { AssignApplicationDto } from '../../common/dto/assign-application.dto';
import { AssignRoleDto } from '../../common/dto/assign-role.dto';
import { CreateConnectionDto } from '../../common/dto/create-connection.dto';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { Roles } from '../../common/guards/roles.decorator';
import { CreateAppUserDto } from './dto/create-app-user.dto';
import { AppUsersService } from './apps-users.service';
import { AppUserCreatedResponse } from './dto/app-user-created-response.dto';
import { AppUserResponse } from './dto/app-user-response.dto';
import {
	ApiCreateAppUser,
	ApiFindAllAppUsers,
	ApiFindAppUserApplications,
	ApiAssignAppUserApplication,
	ApiAssignAppUserRole,
	ApiFindAppUserConnections,
	ApiCreateAppUserConnection,
} from './swagger/apps-users.swagger';

@ApiTags('Apps users')
@Controller('apps-users')
@Roles(Role.ADMIN)
export class AppUsersController {
	constructor(private readonly appUsersService: AppUsersService) {}

	@Post()
	@HttpCode(HttpStatus.CREATED)
	@ApiCreateAppUser()
	create(@Body() dto: CreateAppUserDto): Promise<ResponseBody<AppUserCreatedResponse>> {
		return this.appUsersService.create(dto);
	}

	@Get()
	@ApiFindAllAppUsers()
	findAll(): Promise<ResponseBody<AppUserResponse[]>> {
		return this.appUsersService.findAll();
	}

	@Get(':id/applications')
	@ApiFindAppUserApplications()
	findAssignedApplications(
		@Param('id', ParseIntPipe) id: number,
	): Promise<ResponseBody<AppUserEntity>> {
		return this.appUsersService.findAssignedApplications(id);
	}

	@Post(':id/applications')
	@HttpCode(HttpStatus.CREATED)
	@ApiAssignAppUserApplication()
	assignApplication(
		@Param('id', ParseIntPipe) id: number,
		@Body() dto: AssignApplicationDto,
	): Promise<ResponseBody<AppUserEntity>> {
		return this.appUsersService.assignApplication(id, dto);
	}

	@Post(':id/roles')
	@HttpCode(HttpStatus.CREATED)
	@ApiAssignAppUserRole()
	assignRole(
		@Param('id', ParseIntPipe) id: number,
		@Body() dto: AssignRoleDto,
	): Promise<ResponseBody<AppUserEntity>> {
		return this.appUsersService.assignRole(id, dto);
	}

	@Get(':id/connections')
	@ApiFindAppUserConnections()
	findConnections(@Param('id', ParseIntPipe) id: number): Promise<ResponseBody<AppUserEntity>> {
		return this.appUsersService.findConnections(id);
	}

	@Post(':id/connections')
	@HttpCode(HttpStatus.CREATED)
	@ApiCreateAppUserConnection()
	createConnection(
		@Param('id', ParseIntPipe) id: number,
		@Body() dto: CreateConnectionDto,
	): Promise<ResponseBody<AppUserEntity>> {
		return this.appUsersService.createConnection(id, dto);
	}
}
