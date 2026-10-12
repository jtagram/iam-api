import { jest } from '@jest/globals';

/** Untyped async-friendly mock function for hand-built collaborators. */
/**
 * Any value a collaborator method may return. `unknown` alone would make
 * `mockResolvedValue` accept only `never` (it unwraps `PromiseLike<infer U>`).
 */
type MockResult =
  | Promise<unknown>
  | object
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined;

/**
 * Method-signature types are checked bivariantly, so implementations with
 * narrower parameters (`(entity: X) => ...`) are accepted while the arguments
 * asserted with `toHaveBeenCalledWith` stay unconstrained.
 */
type MockSignature = {
  call(...args: unknown[]): MockResult;
}['call'];

export const mockFn = () => jest.fn<MockSignature>();

/**
 * Reads a prototype method without tripping `unbound-method`: specs that wrap
 * the original with `jest.spyOn(...).mockImplementation` call it back via
 * `.call(this, ...)`, so the lack of binding is intended.
 */
export function prototypeMethod<T extends object, K extends keyof T>(
  prototype: T,
  key: K,
): T[K] {
  return Reflect.get(prototype, key);
}
