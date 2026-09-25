import { AppsPayload } from './apps-payload';

/**
 * Minimal shape JwtAuthGuard/RolesGuard need from a decoded token --
 * everything both `AppUserPayloadJwt` and `InternalUserPayloadJwt`
 * already carry, but named without depending on either feature module's
 * own class (this stays in `common/`, features depend on it, never the
 * other way around).
 */
export interface AuthenticatedUser {
  apps: AppsPayload;
}
