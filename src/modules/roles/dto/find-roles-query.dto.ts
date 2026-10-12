import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class FindRolesQueryDto {
  @ApiProperty({
    description: 'Identifier of the application whose roles are listed.',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  applicationId: number;
}
