import { applyDecorators } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';
import {
	ORIGIN_APPLICATION_HEADER,
	TARGET_APPLICATION_HEADER,
} from '../decorators/application-name.decorator';

/**
 * Documents the two required application headers read by `@OriginApplication()`
 * and `@TargetApplication()`. Reuse it on every endpoint that uses them so the
 * header names stay in sync with the runtime decorators.
 */
export const ApiApplicationHeaders = () =>
	applyDecorators(
		ApiHeader({
			name: ORIGIN_APPLICATION_HEADER,
			description: 'Origin application making the request.',
			required: true,
			example: 'ticket-hub-web',
		}),
		ApiHeader({
			name: TARGET_APPLICATION_HEADER,
			description: 'Destination application the token is requested for.',
			required: true,
			example: 'ticket-hub-api',
		}),
	);
