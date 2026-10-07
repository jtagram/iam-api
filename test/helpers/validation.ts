import { ArgumentMetadata, Type, ValidationPipe } from '@nestjs/common';

/**
 * Same options main.ts passes to the global ValidationPipe. If main.ts changes,
 * change this too: DTO specs must validate exactly like the running app.
 */
export function buildGlobalValidationPipe(): ValidationPipe {
  return new ValidationPipe({ whitelist: true, transform: true });
}

/** Runs a request body through the global pipe; rejects with BadRequestException. */
export function validateBody<T>(metatype: Type<T>, value: unknown): Promise<T> {
  const metadata: ArgumentMetadata = { type: 'body', metatype };
  return buildGlobalValidationPipe().transform(value, metadata) as Promise<T>;
}

/** Runs a query string object through the global pipe. */
export function validateQuery<T>(
  metatype: Type<T>,
  value: unknown,
): Promise<T> {
  const metadata: ArgumentMetadata = { type: 'query', metatype };
  return buildGlobalValidationPipe().transform(value, metadata) as Promise<T>;
}

/** Returns the validation messages of the BadRequestException, or [] when valid. */
export async function validationMessages<T>(
  run: () => Promise<T>,
): Promise<string[]> {
  try {
    await run();
    return [];
  } catch (error) {
    const response = (
      error as { getResponse?: () => { message?: string | string[] } }
    ).getResponse?.();
    const message = response?.message ?? [];
    return Array.isArray(message) ? message : [message];
  }
}
