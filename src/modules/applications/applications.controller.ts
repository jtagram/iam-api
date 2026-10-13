import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { Role } from '../../common/database/role/role.enum';
import { Roles } from '../../common/guards/roles.decorator';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ApplicationsService } from './applications.service';
import { ApplicationResponse } from './dto/application-response.dto';
import { ApiCreateApplication, ApiFindAllApplications } from './swagger/applications.swagger';

@ApiTags('Applications')
@Controller('applications')
@Roles(Role.ADMIN)
export class ApplicationsController {
	constructor(private readonly applicationsService: ApplicationsService) {}

	@Post()
	@HttpCode(HttpStatus.CREATED)
	@ApiCreateApplication()
	create(@Body() dto: CreateApplicationDto): Promise<ResponseBody<ApplicationResponse>> {
		return this.applicationsService.create(dto);
	}

	@Get()
	@ApiFindAllApplications()
	findAll(): Promise<ResponseBody<ApplicationResponse[]>> {
		return this.applicationsService.findAll();
	}
}
