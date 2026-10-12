import { ApiProperty } from '@nestjs/swagger';

export class ApplicationResponse {
  @ApiProperty({ description: 'Application identifier.', example: 1 })
  id: number;

  @ApiProperty({
    description: 'Unique application name.',
    example: 'ticket-hub-api',
    maxLength: 15,
  })
  name: string;

  @ApiProperty({
    description: 'Application description.',
    example: 'Ticket management API',
    maxLength: 200,
  })
  description: string;
}
