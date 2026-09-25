import { AppsPayload } from './apps-payload';

/**
 * Builds the `apps.application` claim shared by both JWT payloads.
 * Extracted here (not inlined in `AppUsersLoginService`/
 * `InternalUsersLoginService`) because the construction itself is
 * identical in both — only the resolved application/roles differ, and
 * those are already the same shape in both flows (`ApplicationEntity`/
 * `RoleEntity` fields). Same static-method-class pattern already used by
 * `AppUserMapper`/`RoleMapper`/`InternalUserMapper` in this project.
 */
export class AppsPayloadMapper {
  static buildAppsPayload(
    application: { id: number; name: string; description: string },
    roles: Array<{ id: number; name: string; description: string }>,
  ): AppsPayload {
    return {
      application: {
        id: application.id,
        name: application.name,
        description: application.description,
        roles: roles.map((role) => ({
          id: role.id,
          name: role.name,
          description: role.description,
        })),
      },
    };
  }
}
