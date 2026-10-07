import { jest } from '@jest/globals';

/** Untyped async-friendly mock function for hand-built collaborators. */
export const mockFn = () => jest.fn<(...args: any[]) => any>();
