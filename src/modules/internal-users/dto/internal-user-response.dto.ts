import { ApiProperty } from '@nestjs/swagger';

export class InternalUserResponse {
	@ApiProperty({ description: 'Internal user identifier.', example: 1 })
	id: number;

	@ApiProperty({ description: 'First name.', example: 'Jane', maxLength: 30 })
	name: string;

	@ApiProperty({ description: 'Last name.', example: 'Doe', maxLength: 30 })
	lastname: string;

	@ApiProperty({
		description: 'Email address.',
		example: 'jane.doe@example.com',
		maxLength: 30,
	})
	email: string;
}
