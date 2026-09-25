import { Injectable } from '@nestjs/common';
import { ApplicationsRepository } from '../../common/database/application/applications.repository';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ApplicationMapper } from './application.mapper';
import { ApplicationResponse } from './dto/application-response.dto';

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly applicationsRepository: ApplicationsRepository,
  ) {}

  async create(
    dto: CreateApplicationDto,
  ): Promise<ResponseBody<ApplicationResponse>> {
    const applicationEntity = ApplicationMapper.toEntity(dto);
    const createdApplication =
      await this.applicationsRepository.createApplication(applicationEntity);

    return ResponseBody.builder<ApplicationResponse>()
      .withMsg('Application created successfully')
      .withData(ApplicationMapper.toResponse(createdApplication))
      .build();
  }

  async findAll(): Promise<ResponseBody<ApplicationResponse[]>> {
    const applications = await this.applicationsRepository.findAll();

    return ResponseBody.builder<ApplicationResponse[]>()
      .withMsg('Applications retrieved successfully')
      .withData(
        applications.map((application) =>
          ApplicationMapper.toResponse(application),
        ),
      )
      .build();
  }
}
