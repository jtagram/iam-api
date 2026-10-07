import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import * as bcrypt from 'bcrypt';
import { mockFn } from '../../../../../test/helpers/mocks';
import { AppUserEntity } from '../../../../common/database/app-user/app-user.entity';
import { AppUsersRepository } from '../../../../common/database/app-user/app-users.repository';
import { AppUsersService } from '../../apps-users.service';
import { CredentialGenerator } from '../../credential-generator';

const dto = { name: 'Billing', description: 'Billing service' };

describe('AppUsersService.create', () => {
  let repository: { createAppUser: ReturnType<typeof mockFn> };
  let service: AppUsersService;

  beforeEach(() => {
    repository = { createAppUser: mockFn() };
    service = new AppUsersService(
      repository as unknown as AppUsersRepository,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    jest
      .spyOn(CredentialGenerator, 'generateClienteId')
      .mockReturnValue('cid-123456789012');
    jest
      .spyOn(CredentialGenerator, 'generateClienteSecret')
      .mockReturnValue('plain-secret');
    repository.createAppUser.mockImplementation(async (entity: AppUserEntity) =>
      Object.assign(entity, { id: 3 }),
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('persists an entity with the generated clienteId and the dto fields', async () => {
    await service.create(dto);

    const entity = repository.createAppUser.mock.calls[0][0];
    expect(entity).toBeInstanceOf(AppUserEntity);
    expect(entity).toMatchObject({
      clienteId: 'cid-123456789012',
      name: 'Billing',
      description: 'Billing service',
    });
  });

  it('stores a bcrypt hash of the secret, never the plaintext', async () => {
    await service.create(dto);

    const entity = repository.createAppUser.mock.calls[0][0];
    expect(entity.clienteSecret).not.toBe('plain-secret');
    expect(entity.clienteSecret).toMatch(/^\$2[aby]\$10\$/);
    await expect(
      bcrypt.compare('plain-secret', entity.clienteSecret),
    ).resolves.toBe(true);
  });

  it('returns the plaintext secret once, with the created user data', async () => {
    await expect(service.create(dto)).resolves.toEqual({
      msg: 'Application user created successfully — store clienteSecret now, it cannot be retrieved again',
      data: {
        id: 3,
        clienteId: 'cid-123456789012',
        clienteSecret: 'plain-secret',
        name: 'Billing',
        description: 'Billing service',
      },
    });
  });

  it('does not return the stored hash', async () => {
    const result = await service.create(dto);
    const entity = repository.createAppUser.mock.calls[0][0];

    expect(JSON.stringify(result)).not.toContain(entity.clienteSecret);
  });

  it('generates fresh credentials on every call', async () => {
    await service.create(dto);
    await service.create(dto);

    expect(CredentialGenerator.generateClienteId).toHaveBeenCalledTimes(2);
    expect(CredentialGenerator.generateClienteSecret).toHaveBeenCalledTimes(2);
  });

  it('propagates a repository failure', async () => {
    const failure = new Error('db down');
    repository.createAppUser.mockRejectedValue(failure);

    await expect(service.create(dto)).rejects.toBe(failure);
  });
});
