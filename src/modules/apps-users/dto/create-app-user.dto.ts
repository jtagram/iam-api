import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CreateAppUserDto {
  @ApiProperty({
    description: 'Application user name.',
    example: 'ticket-worker',
    maxLength: 20,
  })
  @IsString()
  @MaxLength(20)
  name: string;

  @ApiProperty({
    description: 'Application user description.',
    example: 'Background worker of the ticket hub',
    maxLength: 200,
  })
  @IsString()
  @MaxLength(200)
  description: string;
}
