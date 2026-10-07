import { describe, expect, it } from '@jest/globals';
import { AppsPayloadMapper } from '../apps-payload.mapper';

describe('AppsPayloadMapper.buildAppsPayload', () => {
  it('builds the application claim with its roles', () => {
    const payload = AppsPayloadMapper.buildAppsPayload(
      { id: 1, name: 'iam', description: 'Identity' },
      [
        { id: 10, name: 'ADMIN', description: 'Administrator' },
        { id: 11, name: 'VIEWER', description: 'Read only' },
      ],
    );

    expect(payload).toEqual({
      application: {
        id: 1,
        name: 'iam',
        description: 'Identity',
        roles: [
          { id: 10, name: 'ADMIN', description: 'Administrator' },
          { id: 11, name: 'VIEWER', description: 'Read only' },
        ],
      },
    });
  });

  it('builds an empty roles list when there are no roles', () => {
    const payload = AppsPayloadMapper.buildAppsPayload(
      { id: 1, name: 'iam', description: 'Identity' },
      [],
    );

    expect(payload.application.roles).toEqual([]);
  });

  it('copies only id, name and description (drops extra fields)', () => {
    const payload = AppsPayloadMapper.buildAppsPayload(
      { id: 1, name: 'iam', description: 'Identity', secret: 'x' } as never,
      [{ id: 10, name: 'ADMIN', description: 'A', applicationId: 1 } as never],
    );

    expect(Object.keys(payload.application).sort()).toEqual([
      'description',
      'id',
      'name',
      'roles',
    ]);
    expect(Object.keys(payload.application.roles[0]).sort()).toEqual([
      'description',
      'id',
      'name',
    ]);
  });

  it('does not mutate its inputs', () => {
    const roles = [{ id: 10, name: 'ADMIN', description: 'A' }];

    const payload = AppsPayloadMapper.buildAppsPayload(
      { id: 1, name: 'iam', description: 'I' },
      roles,
    );

    expect(payload.application.roles[0]).not.toBe(roles[0]);
  });
});
