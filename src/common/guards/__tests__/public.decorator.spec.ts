import { describe, expect, it } from '@jest/globals';
import { IS_PUBLIC_KEY, Public } from '../public.decorator';

describe('Public', () => {
  it('exposes the metadata key used by the guards', () => {
    expect(IS_PUBLIC_KEY).toBe('isPublic');
  });

  it('marks a handler as public', () => {
    class Controller {
      @Public()
      handler() {}
    }

    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, Controller.prototype.handler),
    ).toBe(true);
  });

  it('marks a whole controller class as public', () => {
    @Public()
    class Controller {}

    expect(Reflect.getMetadata(IS_PUBLIC_KEY, Controller)).toBe(true);
  });

  it('does not mark handlers that were not decorated', () => {
    class Controller {
      @Public()
      open() {}

      closed() {}
    }

    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, Controller.prototype.closed),
    ).toBeUndefined();
  });
});
