import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { Role } from '../../common/database/role/role.enum';
import { Roles } from '../../common/guards/roles.decorator';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ApplicationsService } from './applications.service';
import { ApplicationResponse } from './dto/application-response.dto';

@Controller('applications')
@Roles(Role.ADMIN)
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateApplicationDto,
  ): Promise<ResponseBody<ApplicationResponse>> {
    return this.applicationsService.create(dto);
  }

  @Get()
  findAll(): Promise<ResponseBody<ApplicationResponse[]>> {
    return this.applicationsService.findAll();
  }
}
