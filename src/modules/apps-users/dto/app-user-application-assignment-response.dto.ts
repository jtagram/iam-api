import { ApiProperty } from '@nestjs/swagger';

/** Returned when an application is assigned to an application user. */
export class AppUserApplicationAssignmentResponse {
	@ApiProperty({ description: 'Assignment identifier.', example: 1 })
	id: number;

	@ApiProperty({ description: 'Application user identifier.', example: 1 })
	appUserId: number;

	@ApiProperty({ description: 'Assigned application identifier.', example: 2 })
	applicationId: number;
}
