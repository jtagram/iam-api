import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from '@jest/globals';
import { ApplicationEntity } from '../src/common/database/application/application.entity';
import { AppTestApp, createAppTestApp } from './helpers/app-test-app';
import { seedIamAdmin } from './helpers/seed';
import {
  adminAuthorization,
  authorizationHeaderFor,
} from './helpers/test-auth';

// Smoke suite: the REAL AppModule (see helpers/app-test-app.ts for what is
// stubbed). Per-endpoint behavior is covered by the module-level e2e suites.
describe('AppModule (e2e smoke)', () => {
  let testApp: AppTestApp;

  beforeAll(async () => {
    testApp = await createAppTestApp();
  });

  beforeEach(async () => {
    await testApp.resetTables();
    await seedIamAdmin(testApp.dataSource);
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('boots the real AppModule and serves the public JWKS without a token', async () => {
    const response = await testApp
      .http()
      .get('/.well-known/jwks.json')
      .expect(200);

    expect(response.body.keys).toHaveLength(1);
  });

  it('returns 404 for a route that does not exist', async () => {
    await testApp.http().get('/').expect(404);
  });

  it('returns 401 on a protected route without a token', async () => {
    await testApp.http().get('/applications').expect(401);
  });

  it('returns 403 when the token belongs to another application', async () => {
    await testApp
      .http()
      .get('/applications')
      .set(
        'Authorization',
        authorizationHeaderFor({ applicationName: 'other' }),
      )
      .expect(403);
  });

  it('returns 403 when the token lacks the ADMIN role', async () => {
    await testApp
      .http()
      .get('/applications')
      .set('Authorization', authorizationHeaderFor({ roles: ['VIEWER'] }))
      .expect(403);
  });

  it('applies the global ValidationPipe with whitelist and transform', async () => {
    await testApp
      .http()
      .post('/applications')
      .set('Authorization', adminAuthorization())
      .send({ name: 'billing', description: 'Billing', extra: 'stripped' })
      .expect(201);

    await testApp
      .http()
      .post('/applications')
      .set('Authorization', adminAuthorization())
      .send({ name: 123, description: 'Bad' })
      .expect(400);

    // transform: true turns the query string into a number for FindRolesQueryDto
    const iam = await testApp.dataSource
      .getRepository(ApplicationEntity)
      .findOneByOrFail({ name: 'iam' });
    const roles = await testApp
      .http()
      .get('/roles')
      .query({ applicationId: String(iam.id) })
      .set('Authorization', adminAuthorization())
      .expect(200);
    expect(roles.body.data).toHaveLength(1);
  });

  it('creates an application through the real wiring and persists it in pg-mem', async () => {
    const created = await testApp
      .http()
      .post('/applications')
      .set('Authorization', adminAuthorization())
      .send({ name: 'smoke-app', description: 'Smoke' })
      .expect(201);

    const row = await testApp.dataSource
      .getRepository(ApplicationEntity)
      .findOneByOrFail({ id: created.body.data.id });
    expect(row.name).toBe('smoke-app');

    const listed = await testApp
      .http()
      .get('/applications')
      .set('Authorization', adminAuthorization())
      .expect(200);
    expect(listed.body.data.map((a: { name: string }) => a.name)).toEqual(
      expect.arrayContaining(['iam', 'smoke-app']),
    );
  });
});
