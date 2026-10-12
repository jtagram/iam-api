import { AppsPayload } from '../../src/common/jwt/apps-payload';

/** Claims of the tokens issued by this API, plus the registered ones. */
export interface TokenPayload {
  iat: number;
  exp: number;
  sub: number;
  apps: AppsPayload;
  origin: string;
  email?: string;
  [claim: string]: unknown;
}
