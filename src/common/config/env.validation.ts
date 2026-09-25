import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsNumberString,
  IsString,
  validateSync,
} from 'class-validator';

const PINO_LOG_LEVELS = [
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
] as const;

export class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  POSTGRES_USER!: string;

  @IsString()
  @IsNotEmpty()
  POSTGRES_PASSWORD!: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_HOST!: string;

  @IsNumberString()
  DATABASE_PORT!: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_NAME!: string;

  /**
   * PEM-encoded RSA private/public key pair (RS256), not a shared HMAC
   * secret -- this app is the only one that ever signs (needs
   * `JWT_PRIVATE_KEY`), while any other service in the ecosystem
   * verifies against the public half alone, fetched from
   * `GET /.well-known/jwks.json` (see `modules/jwks/`), never handed
   * this env var directly. See `documentation/generating-jwt-keys.md`
   * for how to produce both values.
   */
  @IsString()
  @IsNotEmpty()
  JWT_PRIVATE_KEY!: string;

  @IsString()
  @IsNotEmpty()
  JWT_PUBLIC_KEY!: string;

  /**
   * `jsonwebtoken`'s `expiresIn` format (e.g. `1h`, `15m`, `3600`) — kept
   * as a plain string and passed straight through, not parsed here.
   * Unlike ticket-hub-api (which hardcodes a 1h `TOKEN_EXPIRY` constant),
   * this app takes it from config so machine-to-machine token lifetime
   * can be tuned per-deployment without a rebuild.
   */
  @IsString()
  @IsNotEmpty()
  JWT_EXPIRES_IN!: string;

  @IsNumberString()
  PORT!: string;

  @IsIn(PINO_LOG_LEVELS)
  LOG_LEVEL!: string;
}

export function validate(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config);

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const invalid = errors.map((error) => error.property).join(', ');
    throw new Error(`Missing required environment variable(s): ${invalid}`);
  }

  return validatedConfig;
}
