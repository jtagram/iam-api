/**
 * Response body for `POST /apps-users/login` and `POST /internal-users/login`.
 * Lives in `common/` (not under either feature module's `dto/`) because it
 * has two real, unrelated consumers — `apps-users` and `internal-users`,
 * each with its own self-contained login — not a single feature module it
 * could be said to belong to. If the two login responses ever need to
 * diverge, split this back into a per-module DTO at that point.
 */
export class ResponseLogin {
  access_token: string;

  constructor(access_token: string) {
    this.access_token = access_token;
  }
}
