import { ApiProperty } from '@nestjs/swagger';

/** Documents the `UserRoleEntity` row returned when assigning a role. */
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
