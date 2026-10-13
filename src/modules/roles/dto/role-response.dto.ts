import { ApiProperty } from '@nestjs/swagger';

export class RoleResponse {
	@ApiProperty({ description: 'Role identifier.', example: 3 })
	id: number;

	@ApiProperty({
		description: 'Identifier of the application the role belongs to.',
		example: 1,
	})
	applicationId: number;

	@ApiProperty({
		description: 'Role name.',
		example: 'ADMIN',
		maxLength: 20,
	})
	name: string;

	@ApiProperty({
		description: 'Role description.',
		example: 'Full access to the application',
		maxLength: 200,
	})
	description: string;
}
