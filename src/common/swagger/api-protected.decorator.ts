import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';

/**
 * Documents an endpoint guarded by the global `JwtAuthGuard`,
 * `ApplicationAccessGuard` and `RolesGuard`: bearer auth plus the generic
 * 401 and 403 responses those guards produce. Reuse it in every composed
 * decorator of a protected endpoint.
 *
 * A status can only be declared once per operation, so an endpoint with extra
 * 403 cases passes them in `extraForbiddenCases` instead of declaring its own
 * `ApiForbiddenResponse`.
 */
export const ApiProtected = (extraForbiddenCases: string[] = []) =>
	applyDecorators(
		ApiBearerAuth(),
		ApiUnauthorizedResponse({
			description: [
				'Authentication failed:',
				'- `Missing or malformed bearer token`: the `Authorization: Bearer <token>` header is absent or malformed.',
				'- `Invalid or expired token`: the token signature is invalid or the token has expired.',
			].join('\n'),
		}),
		ApiForbiddenResponse({
			description: [
				'Access denied:',
				'- `This token was not issued for the iam application`: the token belongs to another application.',
				'- `You do not have the required role`: the token does not carry the `ADMIN` role in the iam application.',
				...extraForbiddenCases,
			].join('\n'),
		}),
	);
