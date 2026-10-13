import { ApiProperty } from '@nestjs/swagger';

/** Documents the `InternalUserRoleEntity` row returned when assigning a role. */
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
