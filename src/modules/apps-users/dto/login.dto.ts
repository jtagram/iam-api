import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
	@ApiProperty({ example: 'ticket-hub-api', maxLength: 15 })
	@IsString()
	@IsNotEmpty()
	@MaxLength(15)
	clienteId: string;

	@ApiProperty({ example: 's3cret-cliente-secret' })
	@IsString()
	@IsNotEmpty()
	clienteSecret: string;
}
