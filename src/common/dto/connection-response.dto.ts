import { ApiProperty } from '@nestjs/swagger';

/** One `origin -> destination` application pair returned by the connections endpoints. */
export class ConnectionResponse {
	@ApiProperty({ description: 'Connection identifier.', example: 1 })
	id: number;

	@ApiProperty({ description: 'Origin application identifier.', example: 1 })
	originApplicationId: number;

	@ApiProperty({ description: 'Origin application name.', example: 'iam' })
	originApplicationName: string;

	@ApiProperty({
		description: 'Destination application identifier.',
		example: 2,
	})
	destinationApplicationId: number;

	@ApiProperty({
		description: 'Destination application name.',
		example: 'ticket-hub-api',
	})
	destinationApplicationName: string;
}
