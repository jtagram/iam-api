import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { Request } from 'express';

export const APPLICATION_NAME_HEADER = 'x-application-name';
export const TARGET_APPLICATION_HEADER = 'x-target-application';

function requiredHeader(context: ExecutionContext, headerName: string): string {
  const request = context.switchToHttp().getRequest<Request>();
  const header = request.headers[headerName];
  const value = Array.isArray(header) ? header[0] : header;

  if (!value || value.trim().length === 0) {
    throw new BadRequestException(`${headerName} header is required`);
  }

  return value.trim();
}

/**
 * Name of the ORIGIN application (the one making the login), read from the
 * `x-application-name` header. Rejects the request with 400 when it is
 * missing or blank.
 */
export const ApplicationName = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string =>
    requiredHeader(context, APPLICATION_NAME_HEADER),
);

/**
 * Name of the DESTINATION application the token is requested for, read from
 * the `x-target-application` header. Rejects the request with 400 when it is
 * missing or blank.
 */
export const TargetApplication = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string =>
    requiredHeader(context, TARGET_APPLICATION_HEADER),
);
