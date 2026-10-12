import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

/**
 * Body for `POST /apps-users/:id/connections` and
 * `POST /internal-users/:id/connections`. Lives in `common/` for the same
 * reason as `AssignApplicationDto`: two unrelated consumers need the exact
 * same shape.
 */
export class CreateConnectionDto {
  @ApiProperty({
    description: 'Identifier of the origin application.',
    example: 1,
  })
  @IsInt()
  originApplicationId: number;

  @ApiProperty({
    description:
      'Identifier of the destination application. Must differ from the origin.',
    example: 2,
  })
  @IsInt()
  destinationApplicationId: number;
}
