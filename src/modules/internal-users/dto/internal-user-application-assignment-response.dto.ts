import { ApiProperty } from '@nestjs/swagger';

/** Returned when an application is assigned to an internal user. */
export class InternalUserApplicationAssignmentResponse {
	@ApiProperty({ description: 'Assignment identifier.', example: 1 })
	id: number;

	@ApiProperty({ description: 'Internal user identifier.', example: 1 })
	internalUserId: number;

	@ApiProperty({ description: 'Assigned application identifier.', example: 2 })
	applicationId: number;
}
