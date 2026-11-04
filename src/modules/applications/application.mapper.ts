import { ApplicationEntity } from '../../common/database/application/application.entity';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ApplicationResponse } from './dto/application-response.dto';

const APPLICATION_CREATED_MESSAGE = 'Application created successfully';
const APPLICATIONS_RETRIEVED_MESSAGE = 'Applications retrieved successfully';

export class ApplicationMapper {
	static toEntity(dto: CreateApplicationDto): ApplicationEntity {
		return ApplicationEntity.builder().withName(dto.name).withDescription(dto.description).build();
	}

	static toResponse(application: ApplicationEntity): ApplicationResponse {
		return {
			id: application.id,
			name: application.name,
			description: application.description,
		};
	}

	static toCreateResponse(application: ApplicationEntity): ResponseBody<ApplicationResponse> {
		return ResponseBody.success(
			APPLICATION_CREATED_MESSAGE,
			ApplicationMapper.toResponse(application),
		);
	}

	static toFindAllResponse(applications: ApplicationEntity[]): ResponseBody<ApplicationResponse[]> {
		return ResponseBody.success(
			APPLICATIONS_RETRIEVED_MESSAGE,
			applications.map((application) => ApplicationMapper.toResponse(application)),
		);
	}
}
