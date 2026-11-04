import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateApplicationDto {
	@ApiProperty({
		description: 'Unique application name.',
		example: 'ticket-hub-api',
		maxLength: 30,
	})
	@IsString()
	@IsNotEmpty()
	@MaxLength(30)
	name!: string;

	@ApiProperty({
		description: 'Application description.',
		example: 'Ticket management API',
		maxLength: 200,
	})
	@IsString()
	@IsNotEmpty()
	@MaxLength(200)
	description!: string;
}
