import { IsInt } from 'class-validator';

/**
 * Body for `POST /apps-users/:id/roles` and `POST /internal-users/:id/roles`.
 * Lives in `common/` — same two-real-consumers promotion criterion as
 * `AssignApplicationDto`.
 *
 * Deliberately does NOT accept `applicationId`: `apps_roles.applicationId`
 * already determines which application a role belongs to, and
 * `UserRoleEntity`/`InternalUserRoleEntity`'s doc comments require any
 * writer to copy `applicationId` from the resolved `RoleEntity`, never
 * accept it independently from the caller. Not exposing the field here
 * means there's no inconsistent value a caller could even attempt to send
 * — the global `ValidationPipe`'s `whitelist: true` (see `main.ts`) would
 * silently strip it anyway, but omitting it from the DTO is the clearer
 * signal of intent.
 */
export class AssignRoleDto {
  @IsInt()
  roleId: number;
}
