import { beforeEach, describe, expect, it } from '@jest/globals';
import * as bcrypt from 'bcrypt';
import { AppUsersService } from '../../apps-users.service';

describe('AppUsersService.hashSecret', () => {
  let service: AppUsersService;

  beforeEach(() => {
    service = new AppUsersService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
  });

  it('returns a 60-character bcrypt hash with cost 10', async () => {
    const hash = await service.hashSecret('my-secret');

    expect(hash).toHaveLength(60);
    expect(hash).toMatch(/^\$2[aby]\$10\$/);
  });

  it('produces a hash that verifies against the original secret', async () => {
    const hash = await service.hashSecret('my-secret');

    await expect(bcrypt.compare('my-secret', hash)).resolves.toBe(true);
    await expect(bcrypt.compare('other', hash)).resolves.toBe(false);
  });

  it('salts every hash so the same secret hashes differently', async () => {
    const first = await service.hashSecret('my-secret');
    const second = await service.hashSecret('my-secret');

    expect(first).not.toBe(second);
  });
});
