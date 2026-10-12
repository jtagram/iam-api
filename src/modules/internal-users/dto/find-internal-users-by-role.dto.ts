import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class FindInternalUsersByRoleDto {
  @ApiProperty({
    description: 'Name of the application the roles belong to.',
    example: 'ticket-hub-api',
    maxLength: 15,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(15)
  applicationName!: string;

  /** Comma-separated role names, e.g. `ADMIN,APPROVER`. */
  @ApiProperty({
    description: 'Comma-separated role names.',
    example: 'ADMIN,APPROVER',
  })
  @IsString()
  @IsNotEmpty()
  roles!: string;
}
