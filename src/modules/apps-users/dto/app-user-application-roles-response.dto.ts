import { ApiProperty } from '@nestjs/swagger';
import { ApplicationTreeDoc, RoleTreeDoc } from '../../../common/dto/assignment-tree-doc.dto';

// Swagger-only: documents the entity tree returned as is, never used to map data.
// The `clienteSecret` column is never part of the response.

/** A role held in an application: a row of `apps_users_roles` with its role. */
export class AppUserApplicationRoleResponse {
	@ApiProperty({ description: 'Role assignment identifier.', example: 7 })
	id: number;

	@ApiProperty({
		description: 'Identifier of the application assignment it hangs off.',
		example: 4,
	})
	appUserApplicationId: number;

	@ApiProperty({ description: 'Role identifier.', example: 3 })
	roleId: number;

	@ApiProperty({ description: 'Creation timestamp.', example: '2026-01-01T10:00:00.000Z' })
	createdAt: string;

	@ApiProperty({ description: 'Last update timestamp.', example: '2026-01-01T10:00:00.000Z' })
	updatedAt: string;

	@ApiProperty({ description: 'The role.', type: () => RoleTreeDoc })
	role: RoleTreeDoc;
}

/** An application assigned to the user: a row of `apps_users_applications`. */
export class AppUserApplicationRolesResponse {
	@ApiProperty({ description: 'Application assignment identifier.', example: 4 })
	id: number;

	@ApiProperty({ description: 'Application user identifier.', example: 1 })
	appUserId: number;

	@ApiProperty({ description: 'Application identifier.', example: 1 })
	applicationId: number;

	@ApiProperty({ description: 'Creation timestamp.', example: '2026-01-01T10:00:00.000Z' })
	createdAt: string;

	@ApiProperty({ description: 'Last update timestamp.', example: '2026-01-01T10:00:00.000Z' })
	updatedAt: string;

	@ApiProperty({ description: 'The assigned application.', type: () => ApplicationTreeDoc })
	application: ApplicationTreeDoc;

	@ApiProperty({
		description: 'Roles the user holds in this application, newest first.',
		type: () => [AppUserApplicationRoleResponse],
	})
	roles: AppUserApplicationRoleResponse[];
}
