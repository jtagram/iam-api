import { ApplicationEntity } from '../../common/database/application/application.entity';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ApplicationResponse } from './dto/application-response.dto';

export class ApplicationMapper {
  static toEntity(dto: CreateApplicationDto): ApplicationEntity {
    return ApplicationEntity.builder()
      .withName(dto.name)
      .withDescription(dto.description)
      .build();
  }

  static toResponse(application: ApplicationEntity): ApplicationResponse {
    return {
      id: application.id,
      name: application.name,
      description: application.description,
    };
  }
}
