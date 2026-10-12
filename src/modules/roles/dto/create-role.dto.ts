import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, MaxLength } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({
    description: 'Identifier of the application the role belongs to.',
    example: 1,
  })
  @IsInt()
  applicationId: number;

  @ApiProperty({
    description: 'Role name, unique within the application.',
    example: 'ADMIN',
    maxLength: 20,
  })
  @IsString()
  @MaxLength(20)
  name: string;

  @ApiProperty({
    description: 'Role description.',
    example: 'Full access to the application',
    maxLength: 200,
  })
  @IsString()
  @MaxLength(200)
  description: string;
}
