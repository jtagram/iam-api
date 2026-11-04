import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateAppUserDto {
	@ApiProperty({
		description: 'Application user name.',
		example: 'ticket-worker',
		maxLength: 30,
	})
	@IsString()
	@IsNotEmpty()
	@MaxLength(30)
	name: string;

	@ApiProperty({
		description: 'Application user description.',
		example: 'Background worker of the ticket hub',
		maxLength: 200,
	})
	@IsString()
	@IsNotEmpty()
	@MaxLength(200)
	description: string;
}
