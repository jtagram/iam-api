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
import { InternalUserEntity } from '../internal-user.entity';
import { InternalUsersRepository } from '../internal-users.repository';

function buildInternalUser(
  email = 'ada@example.com',
  overrides: { name?: string; password?: string } = {},
) {
  return InternalUserEntity.builder()
    .withName(overrides.name ?? 'Ada')
    .withLastname('Lovelace')
    .withEmail(email)
    .withPassword(overrides.password ?? 'x'.repeat(60))
    .build();
}

describe('InternalUsersRepository (in-memory db)', () => {
  let dataSource: DataSource;
  let typeormRepository: Repository<InternalUserEntity>;
  let repository: InternalUsersRepository;

  beforeAll(async () => {
    dataSource = await createInMemoryDataSource([InternalUserEntity]);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    jest.restoreAllMocks();
    typeormRepository = dataSource.getRepository(InternalUserEntity);
    await typeormRepository.clear();
    repository = new InternalUsersRepository(typeormRepository);
  });

  describe('createInternalUser', () => {
    it('persists the internal user and returns it with a generated id', async () => {
      const saved = await repository.createInternalUser(buildInternalUser());

      expect(saved.id).toEqual(expect.any(Number));
      expect(saved).toMatchObject({
        name: 'Ada',
        lastname: 'Lovelace',
        email: 'ada@example.com',
      });
      expect(await typeormRepository.count()).toBe(1);
    });

    it('rejects a duplicated email (unique constraint)', async () => {
      await repository.createInternalUser(buildInternalUser('ada@example.com'));

      await expect(
        repository.createInternalUser(buildInternalUser('ada@example.com')),
      ).rejects.toThrow(/duplicate key value violates unique constraint/);
      expect(await typeormRepository.count()).toBe(1);
    });

    it('treats emails that differ only in case as different (current behavior)', async () => {
      await repository.createInternalUser(buildInternalUser('ada@example.com'));
      await repository.createInternalUser(buildInternalUser('ADA@example.com'));

      expect(await typeormRepository.count()).toBe(2);
    });

    it('rejects an email longer than 30 characters', async () => {
      const email = `${'x'.repeat(20)}@example.com`;

      await expect(
        repository.createInternalUser(buildInternalUser(email)),
      ).rejects.toThrow();
    });

    it('rejects a password hash longer than 60 characters', async () => {
      await expect(
        repository.createInternalUser(
          buildInternalUser('a@example.com', { password: 'x'.repeat(61) }),
        ),
      ).rejects.toThrow();
    });

    it('rejects a name longer than 30 characters', async () => {
      await expect(
        repository.createInternalUser(
          buildInternalUser('a@example.com', { name: 'x'.repeat(31) }),
        ),
      ).rejects.toThrow();
    });
  });

  describe('findByEmail', () => {
    it('returns the internal user with that email', async () => {
      await repository.createInternalUser(buildInternalUser('a@example.com'));
      await repository.createInternalUser(buildInternalUser('b@example.com'));

      await expect(
        repository.findByEmail('b@example.com'),
      ).resolves.toMatchObject({ email: 'b@example.com' });
    });

    it('returns null when the email does not exist', async () => {
      await expect(
        repository.findByEmail('none@example.com'),
      ).resolves.toBeNull();
    });
  });

  describe('findById', () => {
    it('returns the internal user with that id', async () => {
      const saved = await repository.createInternalUser(buildInternalUser());

      await expect(repository.findById(saved.id)).resolves.toMatchObject({
        id: saved.id,
      });
    });

    it('returns null when the id does not exist', async () => {
      await expect(repository.findById(999)).resolves.toBeNull();
    });
  });

  describe('findAll', () => {
    it('returns an empty list when there are no internal users', async () => {
      await expect(repository.findAll()).resolves.toEqual([]);
    });

    it('returns every internal user', async () => {
      await repository.createInternalUser(buildInternalUser('a@example.com'));
      await repository.createInternalUser(buildInternalUser('b@example.com'));

      const all = await repository.findAll();

      expect(all.map((user) => user.email).sort()).toEqual([
        'a@example.com',
        'b@example.com',
      ]);
    });
  });

  describe('findByIds', () => {
    it('returns only the internal users with the given ids', async () => {
      const a = await repository.createInternalUser(
        buildInternalUser('a@example.com'),
      );
      await repository.createInternalUser(buildInternalUser('b@example.com'));
      const c = await repository.createInternalUser(
        buildInternalUser('c@example.com'),
      );

      const found = await repository.findByIds([a.id, c.id]);

      expect(found.map((user) => user.email).sort()).toEqual([
        'a@example.com',
        'c@example.com',
      ]);
    });

    it('ignores ids that do not exist', async () => {
      const a = await repository.createInternalUser(
        buildInternalUser('a@example.com'),
      );

      await expect(repository.findByIds([a.id, 999])).resolves.toHaveLength(1);
    });

    it('returns an empty list without querying when no ids are given', async () => {
      const findSpy = jest.spyOn(typeormRepository, 'find');

      await expect(repository.findByIds([])).resolves.toEqual([]);

      expect(findSpy).not.toHaveBeenCalled();
    });
  });
});
