import { ApiProperty } from '@nestjs/swagger';

/** Returned when a role is assigned to an internal user. */
export class InternalUserRoleAssignmentResponse {
	@ApiProperty({ description: 'Assignment identifier.', example: 1 })
	id: number;

	@ApiProperty({ description: 'Internal user identifier.', example: 1 })
	internalUserId: number;

	@ApiProperty({
		description: 'Application the role belongs to.',
		example: 2,
	})
	applicationId: number;

	@ApiProperty({ description: 'Assigned role identifier.', example: 3 })
	roleId: number;
}
