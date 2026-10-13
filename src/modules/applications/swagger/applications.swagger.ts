import { applyDecorators } from '@nestjs/common';
import { ApiBadRequestResponse, ApiConflictResponse, ApiOperation } from '@nestjs/swagger';
import { ApiProtected } from '../../../common/swagger/api-protected.decorator';
import {
	ApiCreatedResponseBody,
	ApiOkResponseBody,
} from '../../../common/swagger/api-response-body.decorator';
import { ApplicationResponse } from '../dto/application-response.dto';

export const ApiCreateApplication = () =>
	applyDecorators(
		ApiOperation({
			summary: 'Create an application',
			description: 'Registers a new application. Requires the `ADMIN` role in the iam application.',
		}),
		ApiProtected(),
		ApiCreatedResponseBody({
			description: 'Application created.',
			type: ApplicationResponse,
			msg: 'Application created successfully',
		}),
		ApiBadRequestResponse({
			description:
				'Invalid body: `name` (max 15 characters) or `description` (max 200 characters) is missing, not a string or too long.',
		}),
		ApiConflictResponse({
			description: '`An application with this name already exists`: the `name` is already taken.',
		}),
	);

export const ApiFindAllApplications = () =>
	applyDecorators(
		ApiOperation({
			summary: 'List applications',
			description:
				'Returns every registered application. Requires the `ADMIN` role in the iam application.',
		}),
		ApiProtected(),
		ApiOkResponseBody({
			description: 'Applications retrieved.',
			type: ApplicationResponse,
			isArray: true,
			msg: 'Applications retrieved successfully',
		}),
	);
