import { ApiProperty } from '@nestjs/swagger';

/** Returned when a role is assigned to an application user. */
export class AppUserRoleAssignmentResponse {
	@ApiProperty({ description: 'Assignment identifier.', example: 1 })
	id: number;

	@ApiProperty({ description: 'Application user identifier.', example: 1 })
	appUserId: number;

	@ApiProperty({
		description: 'Application the role belongs to.',
		example: 2,
	})
	applicationId: number;

	@ApiProperty({ description: 'Assigned role identifier.', example: 3 })
	roleId: number;
}
