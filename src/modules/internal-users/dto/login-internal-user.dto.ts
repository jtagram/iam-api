import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginInternalUserDto {
	@ApiProperty({ example: 'admin@jtagram.com', maxLength: 30 })
	@IsEmail()
	@MaxLength(30)
	email: string;

	@ApiProperty({ example: 'S3cret-passw0rd' })
	@IsString()
	@IsNotEmpty()
	password: string;
}
