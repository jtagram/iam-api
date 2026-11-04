import { ConflictException, Injectable } from '@nestjs/common';
import { ApplicationsRepository } from '../../common/database/application/applications.repository';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ApplicationMapper } from './application.mapper';
import { ApplicationResponse } from './dto/application-response.dto';

const APPLICATION_NAME_ALREADY_EXISTS_MESSAGE = 'An application with this name already exists';

@Injectable()
export class ApplicationsService {
	constructor(private readonly applicationsRepository: ApplicationsRepository) {}

	async create(dto: CreateApplicationDto): Promise<ResponseBody<ApplicationResponse>> {
		const existingApplication = await this.applicationsRepository.findByName(dto.name);

		if (existingApplication) {
			throw new ConflictException(APPLICATION_NAME_ALREADY_EXISTS_MESSAGE);
		}

		const applicationEntity = ApplicationMapper.toEntity(dto);

		const createdApplication =
			await this.applicationsRepository.createApplication(applicationEntity);

		return ApplicationMapper.toCreateResponse(createdApplication);
	}

	async findAll(): Promise<ResponseBody<ApplicationResponse[]>> {
		const applications = await this.applicationsRepository.findAllOrderedByCreatedAtDesc();

		return ApplicationMapper.toFindAllResponse(applications);
	}
}
