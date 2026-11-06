import { ApiProperty } from '@nestjs/swagger';

/**
 * Swagger-only classes describing the entity trees the "user with applications
 * and roles" endpoints return. They document the response shape; they are never
 * used to map data at runtime (the entities are serialized as they are).
 */

export class ApplicationTreeDoc {
	@ApiProperty({ description: 'Application identifier.', example: 1 })
	id: number;

	@ApiProperty({ description: 'Application name.', example: 'ticket-hub-api' })
	name: string;

	@ApiProperty({ description: 'Application description.', example: 'Ticket management API' })
	description: string;

	@ApiProperty({ description: 'Creation timestamp.', example: '2026-01-01T10:00:00.000Z' })
	createdAt: string;

	@ApiProperty({ description: 'Last update timestamp.', example: '2026-01-01T10:00:00.000Z' })
	updatedAt: string;
}

export class RoleTreeDoc {
	@ApiProperty({ description: 'Role identifier.', example: 3 })
	id: number;

	@ApiProperty({ description: 'Identifier of the application the role belongs to.', example: 1 })
	applicationId: number;

	@ApiProperty({ description: 'Role name.', example: 'ADMIN' })
	name: string;

	@ApiProperty({ description: 'Role description.', example: 'Full access to the application' })
	description: string;

	@ApiProperty({ description: 'Creation timestamp.', example: '2026-01-01T10:00:00.000Z' })
	createdAt: string;

	@ApiProperty({ description: 'Last update timestamp.', example: '2026-01-01T10:00:00.000Z' })
	updatedAt: string;
}

/**
 * One `origin -> destination` connection of a user, with both applications
 * loaded. The owner id (`internalUserId` / `appUserId`) is added by the
 * user-specific classes that extend it.
 */
export class ConnectionTreeDoc {
	@ApiProperty({ description: 'Connection identifier.', example: 1 })
	id: number;

	@ApiProperty({ description: 'Origin application identifier.', example: 1 })
	originApplicationId: number;

	@ApiProperty({ description: 'Destination application identifier.', example: 2 })
	destinationApplicationId: number;

	@ApiProperty({ description: 'Creation timestamp.', example: '2026-01-01T10:00:00.000Z' })
	createdAt: string;

	@ApiProperty({ description: 'Last update timestamp.', example: '2026-01-01T10:00:00.000Z' })
	updatedAt: string;

	@ApiProperty({ description: 'Origin application.', type: () => ApplicationTreeDoc })
	originApplication: ApplicationTreeDoc;

	@ApiProperty({ description: 'Destination application.', type: () => ApplicationTreeDoc })
	destinationApplication: ApplicationTreeDoc;
}
