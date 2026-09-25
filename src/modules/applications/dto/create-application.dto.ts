import { IsString, MaxLength } from 'class-validator';

export class CreateApplicationDto {
  @IsString()
  @MaxLength(15)
  name: string;

  @IsString()
  @MaxLength(200)
  description: string;
}
