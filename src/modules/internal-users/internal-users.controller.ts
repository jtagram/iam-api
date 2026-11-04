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
import { Role } from '../../common/database/role/role.enum';
import { AssignApplicationDto } from '../../common/dto/assign-application.dto';
import { AssignRoleDto } from '../../common/dto/assign-role.dto';
import { ConnectionResponse } from '../../common/dto/connection-response.dto';
import { CreateConnectionDto } from '../../common/dto/create-connection.dto';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { Roles } from '../../common/guards/roles.decorator';
import { InternalUsersService } from './internal-users.service';
import { CreateInternalUserDto } from './dto/create-internal-user.dto';
import { InternalUserApplicationAssignmentResponse } from './dto/internal-user-application-assignment-response.dto';
import { InternalUserRoleAssignmentResponse } from './dto/internal-user-role-assignment-response.dto';
import { InternalUserResponse } from './dto/internal-user-response.dto';
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
} from './swagger/internal-users.swagger';

@ApiTags('Internal users')
@Controller('internal-users')
@Roles(Role.ADMIN)
export class InternalUsersController {
	constructor(private readonly internalUsersService: InternalUsersService) {}

	@Post()
	@HttpCode(HttpStatus.CREATED)
	@ApiCreateInternalUser()
	create(@Body() dto: CreateInternalUserDto): Promise<ResponseBody<InternalUserResponse>> {
		return this.internalUsersService.create(dto);
	}

	@Get()
	@ApiFindAllInternalUsers()
	findAll(): Promise<ResponseBody<InternalUserResponse[]>> {
		return this.internalUsersService.findAll();
	}

	@Get('by-role')
	@ApiFindInternalUsersByRole()
	findByApplicationAndRoles(
		@Query() query: FindInternalUsersByRoleDto,
	): Promise<ResponseBody<InternalUserResponse[]>> {
		return this.internalUsersService.findByApplicationAndRoles(query);
	}

	@Get(':id/applications')
	@ApiFindInternalUserApplications()
	findAssignedApplications(
		@Param('id', ParseIntPipe) id: number,
	): Promise<ResponseBody<InternalUserApplicationRolesResponse[]>> {
		return this.internalUsersService.findAssignedApplications(id);
	}

	@Post(':id/applications')
	@HttpCode(HttpStatus.CREATED)
	@ApiAssignInternalUserApplication()
	assignApplication(
		@Param('id', ParseIntPipe) id: number,
		@Body() dto: AssignApplicationDto,
	): Promise<ResponseBody<InternalUserApplicationAssignmentResponse>> {
		return this.internalUsersService.assignApplication(id, dto);
	}

	@Post(':id/roles')
	@HttpCode(HttpStatus.CREATED)
	@ApiAssignInternalUserRole()
	assignRole(
		@Param('id', ParseIntPipe) id: number,
		@Body() dto: AssignRoleDto,
	): Promise<ResponseBody<InternalUserRoleAssignmentResponse>> {
		return this.internalUsersService.assignRole(id, dto);
	}

	@Get(':id/connections')
	@ApiFindInternalUserConnections()
	findConnections(
		@Param('id', ParseIntPipe) id: number,
	): Promise<ResponseBody<ConnectionResponse[]>> {
		return this.internalUsersService.findConnections(id);
	}

	@Post(':id/connections')
	@HttpCode(HttpStatus.CREATED)
	@ApiCreateInternalUserConnection()
	createConnection(
		@Param('id', ParseIntPipe) id: number,
		@Body() dto: CreateConnectionDto,
	): Promise<ResponseBody<ConnectionResponse>> {
		return this.internalUsersService.createConnection(id, dto);
	}
}
