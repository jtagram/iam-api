import { ApiProperty } from '@nestjs/swagger';
import { InternalUserApplicationRolesResponse } from './internal-user-application-roles-response.dto';
import { InternalUserResponse } from './internal-user-response.dto';

// Swagger-only: documents the entity returned as is, never used to map data.
// The `password` column is never part of the response.
export class InternalUserWithApplicationsResponse extends InternalUserResponse {
	@ApiProperty({ description: 'Creation timestamp.', example: '2026-01-01T10:00:00.000Z' })
	createdAt: string;

	@ApiProperty({ description: 'Last update timestamp.', example: '2026-01-01T10:00:00.000Z' })
	updatedAt: string;

	@ApiProperty({
		description:
			'Application assignments of the user, newest first, each with its application and the roles the user holds in it (empty for a user without assignments).',
		type: () => [InternalUserApplicationRolesResponse],
	})
	applications: InternalUserApplicationRolesResponse[];
}
