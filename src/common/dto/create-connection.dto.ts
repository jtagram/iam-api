import { IsInt } from 'class-validator';

/**
 * Body for `POST /apps-users/:id/connections` and
 * `POST /internal-users/:id/connections`. Lives in `common/` for the same
 * reason as `AssignApplicationDto`: two unrelated consumers need the exact
 * same shape.
 */
export class CreateConnectionDto {
  @IsInt()
  originApplicationId: number;

  @IsInt()
  destinationApplicationId: number;
}
