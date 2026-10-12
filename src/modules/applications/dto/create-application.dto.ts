import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CreateApplicationDto {
  @ApiProperty({
    description: 'Unique application name.',
    example: 'ticket-hub-api',
    maxLength: 15,
  })
  @IsString()
  @MaxLength(15)
  name: string;

  @ApiProperty({
    description: 'Application description.',
    example: 'Ticket management API',
    maxLength: 200,
  })
  @IsString()
  @MaxLength(200)
  description: string;
}
