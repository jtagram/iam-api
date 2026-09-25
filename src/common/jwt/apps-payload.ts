/**
 * `apps.application`'s payload shapes — shared by `AppUserPayloadJwt` and
 * `InternalUserPayloadJwt`. Lives in `common/` (not under either feature
 * module's own file) for the same reason `ResponseLogin` was promoted to
 * `common/dto/`: it has two real, independent consumers
 * (`AppUsersLoginService`/`InternalUsersLoginService`) that need the exact
 * same shape, not a single feature module it could be said to belong to.
 */

/** One role the logged-in user has assigned for the application it logged into. */
export interface RolePayload {
  id: number;
  name: string;
  description: string;
}

/** The application resolved from `X-Application-Name`, plus the caller's roles on it. */
export interface ApplicationPayload {
  id: number;
  name: string;
  description: string;
  roles: RolePayload[];
}

/** Top-level `apps` claim carried by both JWT payloads. */
export interface AppsPayload {
  application: ApplicationPayload;
}
