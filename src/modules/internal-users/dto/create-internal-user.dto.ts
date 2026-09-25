import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateInternalUserDto {
  @IsString()
  @MaxLength(15)
  name: string;

  @IsString()
  @MaxLength(15)
  lastname: string;

  @IsEmail()
  @MaxLength(30)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;
}
