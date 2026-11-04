import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateInternalUserDto {
	@ApiProperty({ description: 'First name.', example: 'Jane', maxLength: 30 })
	@IsString()
	@IsNotEmpty()
	@MaxLength(30)
	name: string;

	@ApiProperty({ description: 'Last name.', example: 'Doe', maxLength: 30 })
	@IsString()
	@IsNotEmpty()
	@MaxLength(30)
	lastname: string;

	@ApiProperty({
		description: 'Unique email address.',
		example: 'jane.doe@example.com',
		maxLength: 30,
	})
	@IsString()
	@IsNotEmpty()
	@IsEmail()
	@MaxLength(30)
	email: string;

	@ApiProperty({
		description: 'Plaintext password. It is stored hashed.',
		example: 'S3cure-passw0rd',
		minLength: 8,
		maxLength: 72,
	})
	@IsString()
	@IsNotEmpty()
	@MinLength(8)
	@MaxLength(72)
	password: string;
}
