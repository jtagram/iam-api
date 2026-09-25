import { IsString, MaxLength } from 'class-validator';

export class CreateAppUserDto {
  @IsString()
  @MaxLength(20)
  name: string;

  @IsString()
  @MaxLength(200)
  description: string;
}
