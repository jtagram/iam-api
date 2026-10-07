/**
 * Lets `parties` concurrent callers meet: every `arrive()` stays pending until
 * the last party arrives, then all of them continue together. Used to make two
 * requests overlap deterministically instead of relying on timing.
 */
export function createBarrier(parties: number) {
  let arrived = 0;
  let release!: () => void;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });

  return {
    arrive(): Promise<void> {
      arrived += 1;
      if (arrived >= parties) {
        release();
      }
      return released;
    },
  };
}
