import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsPositive, IsString, MaxLength } from 'class-validator';

export class CreateRoleDto {
	@ApiProperty({
		description: 'Identifier of the application the role belongs to.',
		example: 1,
	})
	@IsInt()
	@IsPositive()
	applicationId: number;

	@ApiProperty({
		description: 'Role name, unique within the application.',
		example: 'ADMIN',
		maxLength: 30,
	})
	@IsString()
	@IsNotEmpty()
	@MaxLength(30)
	name: string;

	@ApiProperty({
		description: 'Role description.',
		example: 'Full access to the application',
		maxLength: 200,
	})
	@IsString()
	@IsNotEmpty()
	@MaxLength(200)
	description: string;
}
