import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppUserConnectionEntity } from '../../src/common/database/app-user-connection/app-user-connection.entity';
import { AppUserEntity } from '../../src/common/database/app-user/app-user.entity';
import { ApplicationEntity } from '../../src/common/database/application/application.entity';
import { InternalUserConnectionEntity } from '../../src/common/database/internal-user-connection/internal-user-connection.entity';
import { InternalUserAppEntity } from '../../src/common/database/internal-user/internal-user-app.entity';
import { InternalUserRoleEntity } from '../../src/common/database/internal-user/internal-user-role.entity';
import { InternalUserEntity } from '../../src/common/database/internal-user/internal-user.entity';
import { RoleEntity } from '../../src/common/database/role/role.entity';
import { UserAppEntity } from '../../src/common/database/user-application/user-app.entity';
import { UserRoleEntity } from '../../src/common/database/user-role/user-role.entity';
import { createInMemoryDataSource } from './in-memory-db';
import {
  IAM_APPLICATION_NAME,
  TEST_PRIVATE_KEY,
  TEST_PUBLIC_KEY,
} from './test-auth';

/** The 10 entities registered by src/common/database/database.module.ts. */
export const ENTITIES = [
  ApplicationEntity,
  AppUserEntity,
  RoleEntity,
  UserRoleEntity,
  UserAppEntity,
  InternalUserEntity,
  InternalUserRoleEntity,
  InternalUserAppEntity,
  InternalUserConnectionEntity,
  AppUserConnectionEntity,
];

/** Token lifetime configured for the e2e environment (JWT_EXPIRES_IN). */
export const TEST_JWT_EXPIRES_IN = '15m';
export const TEST_JWT_EXPIRES_IN_SECONDS = 15 * 60;

/** Valid values for every variable validated by src/common/config/env.validation.ts. */
const TEST_ENV: Record<string, string> = {
  PORT: '0',
  // 'silent' is not accepted by the env validation; 'fatal' is quiet enough.
  LOG_LEVEL: 'fatal',
  POSTGRES_USER: 'test',
  POSTGRES_PASSWORD: 'test',
  DATABASE_HOST: 'unused-pg-mem',
  DATABASE_PORT: '5432',
  DATABASE_NAME: 'test',
  JWT_PRIVATE_KEY: TEST_PRIVATE_KEY,
  JWT_PUBLIC_KEY: TEST_PUBLIC_KEY,
  JWT_EXPIRES_IN: TEST_JWT_EXPIRES_IN,
  IAM_APPLICATION_NAME,
};

export interface AppTestApp {
  app: INestApplication;
  dataSource: DataSource;
  /** supertest agent bound to the running app. */
  http: () => ReturnType<typeof request>;
  /**
   * Empties every table. pg-mem's `clear()` only deletes the rows: it does NOT
   * restart the id sequences, so never assume ids start at 1.
   */
  resetTables: () => Promise<void>;
  close: () => Promise<void>;
}

/**
 * Boots the REAL AppModule (EnvModule with validation, pino logger,
 * DatabaseModule/TypeOrmModule, JwtModule, JwksModule, all feature modules and
 * the APP_GUARD / APP_FILTER providers).
 *
 * Replaced edges only:
 *  - the TypeORM DataSource provider -> pg-mem (the forRootAsync factory still
 *    runs with the test env, but nothing connects to Postgres);
 *  - console.error is muted: JwtAuthGuard logs every rejected token with it.
 * process.env is set for the boot and restored on close().
 */
export async function createAppTestApp(): Promise<AppTestApp> {
  const previousEnv: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(TEST_ENV)) {
    previousEnv[key] = process.env[key];
    process.env[key] = value;
  }
  const consoleErrorSpy = jest
    .spyOn(console, 'error')
    .mockImplementation(() => undefined);

  const dataSource = await createInMemoryDataSource(ENTITIES);

  const restore = () => {
    consoleErrorSpy.mockRestore();
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };

  try {
    // Loaded lazily: EnvModule calls ConfigModule.forRoot({ validate }) while
    // the module file is evaluated, so the env must already be set by then.
    // `require` (not `import()`): this project compiles to CommonJS and a
    // native dynamic import() cannot load .ts files under jest.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AppModule } =
      require('../../src/app.module') as typeof import('../../src/app.module');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DataSource)
      .useValue(dataSource)
      .compile();

    const app = moduleRef.createNestApplication({ logger: false });
    // Same options as the global pipe configured in src/main.ts (outside AppModule).
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    return {
      app,
      dataSource,
      http: () => request(app.getHttpServer()),
      resetTables: async () => {
        for (const entity of ENTITIES) {
          await dataSource.getRepository(entity).clear();
        }
      },
      close: async () => {
        await app.close();
        if (dataSource.isInitialized) {
          await dataSource.destroy();
        }
        restore();
      },
    };
  } catch (error) {
    restore();
    throw error;
  }
}
