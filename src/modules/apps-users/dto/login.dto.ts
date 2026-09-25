import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(15)
  clienteId: string;

  @IsString()
  @IsNotEmpty()
  clienteSecret: string;
}
