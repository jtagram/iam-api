import { ApiProperty } from '@nestjs/swagger';

/** Documents the `UserAppEntity` row returned when assigning an application. */
export class AppUserApplicationAssignmentResponse {
	@ApiProperty({ description: 'Assignment identifier.', example: 1 })
	id: number;

	@ApiProperty({ description: 'Application user identifier.', example: 1 })
	appUserId: number;

	@ApiProperty({ description: 'Assigned application identifier.', example: 2 })
	applicationId: number;
}
