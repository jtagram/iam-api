import { ApiProperty } from '@nestjs/swagger';

export class InternalUserApplicationRoleResponse {
	@ApiProperty({ description: 'Role identifier.', example: 3 })
	id: number;

	@ApiProperty({ description: 'Role name.', example: 'ADMIN' })
	name: string;

	@ApiProperty({
		description: 'Role description.',
		example: 'Full access to the application',
	})
	description: string;
}

export class InternalUserApplicationRolesResponse {
	@ApiProperty({ description: 'Application identifier.', example: 1 })
	applicationId: number;

	@ApiProperty({ description: 'Application name.', example: 'ticket-hub-api' })
	applicationName: string;

	@ApiProperty({
		description: 'Application description.',
		example: 'Ticket management API',
	})
	applicationDescription: string;

	@ApiProperty({
		description: 'Roles the user holds in this application.',
		type: () => [InternalUserApplicationRoleResponse],
	})
	roles: InternalUserApplicationRoleResponse[];
}
