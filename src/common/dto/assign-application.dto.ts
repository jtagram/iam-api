import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

/**
 * Body for `POST /apps-users/:id/applications` and
 * `POST /internal-users/:id/applications`. Lives in `common/` (not under
 * either feature module's `dto/`) for the same reason `ResponseLogin` was
 * promoted there: two real, unrelated consumers —
 * `AppUsersService.assignApplication` and
 * `InternalUsersService.assignApplication` — that need the exact same
 * one-field shape, not a single feature module it could be said to
 * belong to.
 */
export class AssignApplicationDto {
  @ApiProperty({
    description: 'Identifier of the application to assign.',
    example: 1,
  })
  @IsInt()
  applicationId: number;
}
