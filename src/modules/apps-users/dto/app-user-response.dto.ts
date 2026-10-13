import { ApiProperty } from '@nestjs/swagger';

export class AppUserResponse {
	@ApiProperty({ description: 'Application user identifier.', example: 1 })
	id: number;

	@ApiProperty({
		description: 'Client identifier used to log in.',
		example: 'a1b2c3d4e5f6',
	})
	clienteId: string;

	@ApiProperty({
		description: 'Application user name.',
		example: 'ticket-worker',
		maxLength: 20,
	})
	name: string;

	@ApiProperty({
		description: 'Application user description.',
		example: 'Background worker of the ticket hub',
		maxLength: 200,
	})
	description: string;
}
