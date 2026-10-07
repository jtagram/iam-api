import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { AppUserConnectionEntity } from '../../src/common/database/app-user-connection/app-user-connection.entity';
import { AppUserEntity } from '../../src/common/database/app-user/app-user.entity';
import { ApplicationEntity } from '../../src/common/database/application/application.entity';
import { InternalUserConnectionEntity } from '../../src/common/database/internal-user-connection/internal-user-connection.entity';
import { InternalUserAppEntity } from '../../src/common/database/internal-user/internal-user-app.entity';
import { InternalUserRoleEntity } from '../../src/common/database/internal-user/internal-user-role.entity';
import { InternalUserEntity } from '../../src/common/database/internal-user/internal-user.entity';
import { RoleEntity } from '../../src/common/database/role/role.entity';
import { Role } from '../../src/common/database/role/role.enum';
import { UserAppEntity } from '../../src/common/database/user-application/user-app.entity';
import { UserRoleEntity } from '../../src/common/database/user-role/user-role.entity';
import { IAM_APPLICATION_NAME } from './test-auth';

// Low cost factor: the hashes only need to be valid bcrypt, not slow.
const SEED_BCRYPT_ROUNDS = 4;

export const ADMIN_EMAIL = 'admin@example.com';
export const ADMIN_PASSWORD = 'admin-password-1';

export interface SeededIam {
  iamApplication: ApplicationEntity;
  adminRole: RoleEntity;
  adminUser: InternalUserEntity;
  adminPassword: string;
}

/**
 * Seeds what a working iam installation needs so that a real login yields an
 * ADMIN token: the iam application, its ADMIN role, an internal user with that
 * role, the user's access to iam and the iam -> iam connection.
 */
export async function seedIamAdmin(dataSource: DataSource): Promise<SeededIam> {
  const iamApplication = await createApplication(
    dataSource,
    IAM_APPLICATION_NAME,
    'Identity and access management',
  );
  const adminRole = await createRole(
    dataSource,
    iamApplication.id,
    Role.ADMIN,
    'Administrator',
  );
  const adminUser = await createInternalUser(dataSource, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    name: 'Admin',
    lastname: 'Istrator',
  });
  await grantInternalUserApplication(
    dataSource,
    adminUser.id,
    iamApplication.id,
  );
  await grantInternalUserRole(dataSource, adminUser.id, adminRole);
  await connectInternalUser(
    dataSource,
    adminUser.id,
    iamApplication.id,
    iamApplication.id,
  );
  return {
    iamApplication,
    adminRole,
    adminUser,
    adminPassword: ADMIN_PASSWORD,
  };
}

export function createApplication(
  dataSource: DataSource,
  name: string,
  description = `${name} description`,
): Promise<ApplicationEntity> {
  return dataSource
    .getRepository(ApplicationEntity)
    .save(
      ApplicationEntity.builder()
        .withName(name)
        .withDescription(description)
        .build(),
    );
}

export function createRole(
  dataSource: DataSource,
  applicationId: number,
  name: string,
  description = `${name} description`,
): Promise<RoleEntity> {
  return dataSource
    .getRepository(RoleEntity)
    .save(
      RoleEntity.builder()
        .withApplicationId(applicationId)
        .withName(name)
        .withDescription(description)
        .build(),
    );
}

export async function createInternalUser(
  dataSource: DataSource,
  user: {
    email: string;
    password?: string;
    name?: string;
    lastname?: string;
  },
): Promise<InternalUserEntity> {
  const hashed = await bcrypt.hash(
    user.password ?? 'some-password-1',
    SEED_BCRYPT_ROUNDS,
  );
  return dataSource.getRepository(InternalUserEntity).save(
    InternalUserEntity.builder()
      .withName(user.name ?? 'Name')
      .withLastname(user.lastname ?? 'Lastname')
      .withEmail(user.email)
      .withPassword(hashed)
      .build(),
  );
}

export function grantInternalUserApplication(
  dataSource: DataSource,
  internalUserId: number,
  applicationId: number,
): Promise<InternalUserAppEntity> {
  return dataSource
    .getRepository(InternalUserAppEntity)
    .save({ internalUserId, applicationId });
}

export function grantInternalUserRole(
  dataSource: DataSource,
  internalUserId: number,
  role: RoleEntity,
): Promise<InternalUserRoleEntity> {
  return dataSource.getRepository(InternalUserRoleEntity).save({
    internalUserId,
    applicationId: role.applicationId,
    roleId: role.id,
  });
}

export function connectInternalUser(
  dataSource: DataSource,
  internalUserId: number,
  originApplicationId: number,
  destinationApplicationId: number,
): Promise<InternalUserConnectionEntity> {
  return dataSource.getRepository(InternalUserConnectionEntity).save({
    internalUserId,
    originApplicationId,
    destinationApplicationId,
  });
}

export async function createAppUser(
  dataSource: DataSource,
  user: {
    clienteId?: string;
    clienteSecret?: string;
    name?: string;
    description?: string;
  } = {},
): Promise<{
  entity: AppUserEntity;
  clienteId: string;
  clienteSecret: string;
}> {
  const clienteId = user.clienteId ?? 'client-id-1';
  const clienteSecret = user.clienteSecret ?? 'client-secret-1';
  const entity = await dataSource.getRepository(AppUserEntity).save(
    AppUserEntity.builder()
      .withClienteId(clienteId)
      .withClienteSecret(await bcrypt.hash(clienteSecret, SEED_BCRYPT_ROUNDS))
      .withName(user.name ?? 'Service')
      .withDescription(user.description ?? 'Service account')
      .build(),
  );
  return { entity, clienteId, clienteSecret };
}

export function grantAppUserApplication(
  dataSource: DataSource,
  appUserId: number,
  applicationId: number,
): Promise<UserAppEntity> {
  return dataSource
    .getRepository(UserAppEntity)
    .save({ appUserId, applicationId });
}

export function grantAppUserRole(
  dataSource: DataSource,
  appUserId: number,
  role: RoleEntity,
): Promise<UserRoleEntity> {
  return dataSource.getRepository(UserRoleEntity).save({
    appUserId,
    applicationId: role.applicationId,
    roleId: role.id,
  });
}

export function connectAppUser(
  dataSource: DataSource,
  appUserId: number,
  originApplicationId: number,
  destinationApplicationId: number,
): Promise<AppUserConnectionEntity> {
  return dataSource.getRepository(AppUserConnectionEntity).save({
    appUserId,
    originApplicationId,
    destinationApplicationId,
  });
}
