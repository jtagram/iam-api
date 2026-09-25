import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginInternalUserDto {
  @IsEmail()
  @MaxLength(30)
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
