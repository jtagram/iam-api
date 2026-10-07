import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { DataSource, Repository } from 'typeorm';
import { createInMemoryDataSource } from '../../../../../test/helpers/in-memory-db';
import { AppUserEntity } from '../app-user.entity';
import { AppUsersRepository } from '../app-users.repository';

function buildAppUser(
  clienteId = 'client-1',
  overrides: { secret?: string; name?: string } = {},
) {
  return AppUserEntity.builder()
    .withClienteId(clienteId)
    .withClienteSecret(overrides.secret ?? 'x'.repeat(60))
    .withName(overrides.name ?? 'Service')
    .withDescription('A service client')
    .build();
}

describe('AppUsersRepository (in-memory db)', () => {
  let dataSource: DataSource;
  let typeormRepository: Repository<AppUserEntity>;
  let repository: AppUsersRepository;

  beforeAll(async () => {
    dataSource = await createInMemoryDataSource([AppUserEntity]);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    jest.restoreAllMocks();
    typeormRepository = dataSource.getRepository(AppUserEntity);
    await typeormRepository.clear();
    repository = new AppUsersRepository(typeormRepository);
  });

  describe('createAppUser', () => {
    it('persists the app user and returns it with a generated id', async () => {
      const saved = await repository.createAppUser(buildAppUser());

      expect(saved.id).toEqual(expect.any(Number));
      expect(saved).toMatchObject({ clienteId: 'client-1', name: 'Service' });
      expect(await typeormRepository.count()).toBe(1);
    });

    it('rejects a duplicated clienteId (unique constraint)', async () => {
      await repository.createAppUser(buildAppUser('client-1'));

      await expect(
        repository.createAppUser(buildAppUser('client-1')),
      ).rejects.toThrow(/duplicate key value violates unique constraint/);
      expect(await typeormRepository.count()).toBe(1);
    });

    it('allows two app users with the same name', async () => {
      await repository.createAppUser(buildAppUser('a', { name: 'Same' }));
      await repository.createAppUser(buildAppUser('b', { name: 'Same' }));

      expect(await typeormRepository.count()).toBe(2);
    });

    it('rejects a clienteId longer than 30 characters', async () => {
      await expect(
        repository.createAppUser(buildAppUser('x'.repeat(31))),
      ).rejects.toThrow();
    });

    it('rejects a clienteSecret longer than 60 characters', async () => {
      await expect(
        repository.createAppUser(buildAppUser('a', { secret: 'x'.repeat(61) })),
      ).rejects.toThrow();
    });

    it('rejects a name longer than 30 characters', async () => {
      await expect(
        repository.createAppUser(buildAppUser('a', { name: 'x'.repeat(31) })),
      ).rejects.toThrow();
    });
  });

  describe('findByClienteId', () => {
    it('returns the app user with that clienteId', async () => {
      await repository.createAppUser(buildAppUser('a'));
      await repository.createAppUser(buildAppUser('b'));

      await expect(repository.findByClienteId('b')).resolves.toMatchObject({
        clienteId: 'b',
      });
    });

    it('returns null when the clienteId does not exist', async () => {
      await expect(repository.findByClienteId('missing')).resolves.toBeNull();
    });

    it('matches the clienteId case-sensitively', async () => {
      await repository.createAppUser(buildAppUser('Abc'));

      await expect(repository.findByClienteId('abc')).resolves.toBeNull();
    });
  });

  describe('findById', () => {
    it('returns the app user with that id', async () => {
      const saved = await repository.createAppUser(buildAppUser());

      await expect(repository.findById(saved.id)).resolves.toMatchObject({
        id: saved.id,
      });
    });

    it('returns null when the id does not exist', async () => {
      await expect(repository.findById(999)).resolves.toBeNull();
    });
  });

  describe('findAll', () => {
    it('returns an empty list when there are no app users', async () => {
      await expect(repository.findAll()).resolves.toEqual([]);
    });

    it('returns every app user', async () => {
      await repository.createAppUser(buildAppUser('a'));
      await repository.createAppUser(buildAppUser('b'));

      const all = await repository.findAll();

      expect(all.map((appUser) => appUser.clienteId).sort()).toEqual([
        'a',
        'b',
      ]);
    });
  });
});
