import { describe, expect, it } from '@jest/globals';
import { GENERIC_ERROR_MESSAGE } from '../generic-error-message';

describe('GENERIC_ERROR_MESSAGE', () => {
  it('is the neutral message shown to clients on unexpected errors', () => {
    expect(GENERIC_ERROR_MESSAGE).toBe(
      'An unexpected error occurred. Please try again later.',
    );
  });
});
