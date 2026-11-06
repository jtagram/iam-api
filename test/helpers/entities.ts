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

/**
 * The 10 entities registered by src/common/database/database.module.ts, parents
 * before the rows that reference them (clear-tables deletes in reverse).
 */
export const ENTITIES = [
	ApplicationEntity,
	AppUserEntity,
	RoleEntity,
	UserAppEntity,
	UserRoleEntity,
	InternalUserEntity,
	InternalUserAppEntity,
	InternalUserRoleEntity,
	InternalUserConnectionEntity,
	AppUserConnectionEntity,
];
