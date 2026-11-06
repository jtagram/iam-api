import { ApiProperty } from '@nestjs/swagger';
import { ConnectionTreeDoc } from '../../../common/dto/assignment-tree-doc.dto';
import { AppUserResponse } from './app-user-response.dto';

// Swagger-only: documents the entity returned as is, never used to map data.
// The `clienteSecret` column is never part of the response.
export class AppUserConnectionTreeResponse extends ConnectionTreeDoc {
	@ApiProperty({
		description: 'Identifier of the application user owning the connection.',
		example: 1,
	})
	appUserId: number;
}

export class AppUserWithConnectionsResponse extends AppUserResponse {
	@ApiProperty({ description: 'Creation timestamp.', example: '2026-01-01T10:00:00.000Z' })
	createdAt: string;

	@ApiProperty({ description: 'Last update timestamp.', example: '2026-01-01T10:00:00.000Z' })
	updatedAt: string;

	@ApiProperty({
		description:
			'Connections of the user, newest first, each with its origin and destination application (empty for a user without connections).',
		type: () => [AppUserConnectionTreeResponse],
	})
	connections: AppUserConnectionTreeResponse[];
}
