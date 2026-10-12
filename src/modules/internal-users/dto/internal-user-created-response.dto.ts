import { ApiProperty } from '@nestjs/swagger';

export class InternalUserCreatedResponse {
  @ApiProperty({ description: 'Internal user identifier.', example: 1 })
  id: number;

  @ApiProperty({ description: 'First name.', example: 'Jane', maxLength: 15 })
  name: string;

  @ApiProperty({ description: 'Last name.', example: 'Doe', maxLength: 15 })
  lastname: string;

  @ApiProperty({
    description: 'Email address.',
    example: 'jane.doe@example.com',
    maxLength: 30,
  })
  email: string;
}
