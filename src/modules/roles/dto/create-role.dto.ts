import { IsInt, IsString, MaxLength } from 'class-validator';

export class CreateRoleDto {
  @IsInt()
  applicationId: number;

  @IsString()
  @MaxLength(20)
  name: string;

  @IsString()
  @MaxLength(200)
  description: string;
}
