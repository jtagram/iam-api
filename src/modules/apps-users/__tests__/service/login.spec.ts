import { beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import {
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { mockFn } from '../../../../../test/helpers/mocks';
import {
  generateRsaKeyPair,
  RsaKeyPair,
} from '../../../../../test/helpers/rsa-keys';
import { ApplicationsRepository } from '../../../../common/database/application/applications.repository';
import { UserAppsRepository } from '../../../../common/database/user-application/user-apps.repository';
import { AppUserConnectionsRepository } from '../../../../common/database/app-user-connection/app-user-connections.repository';
import { AppUsersRepository } from '../../../../common/database/app-user/app-users.repository';
import { UserRolesRepository } from '../../../../common/database/user-role/user-roles.repository';
import { RolesRepository } from '../../../../common/database/role/roles.repository';
import { ResponseLogin } from '../../../../common/dto/response-login.dto';
import { JWT_KEY_ID } from '../../../../common/jwt/jwt-key-id';
import { AppUsersLoginService } from '../../apps-users-login.service';

const ORIGIN = 'iam';
const TARGET = 'ticket-hub';

describe('AppUsersLoginService.login', () => {
  let keys: RsaKeyPair;
  let secretHash: string;
  let users: { findByClienteId: ReturnType<typeof mockFn> };
  let applications: { findByName: ReturnType<typeof mockFn> };
  let userApps: { existsForAppUserAndApplication: ReturnType<typeof mockFn> };
  let connections: {
    existsForAppUserAndApplications: ReturnType<typeof mockFn>;
  };
  let userRoles: {
    findRoleIdsForAppUserAndApplication: ReturnType<typeof mockFn>;
  };
  let roles: { findByIds: ReturnType<typeof mockFn> };
  let config: { get: ReturnType<typeof mockFn> };
  let service: AppUsersLoginService;

  const dto = { clienteId: 'client-1', clienteSecret: 'right-secret' };

  beforeAll(async () => {
    keys = generateRsaKeyPair();
    // Low cost keeps the suite fast; the service only calls bcrypt.compare.
    secretHash = await bcrypt.hash('right-secret', 4);
  });

  beforeEach(() => {
    users = { findByClienteId: mockFn() };
    applications = { findByName: mockFn() };
    userApps = { existsForAppUserAndApplication: mockFn() };
    connections = { existsForAppUserAndApplications: mockFn() };
    userRoles = { findRoleIdsForAppUserAndApplication: mockFn() };
    roles = { findByIds: mockFn() };
    config = { get: mockFn() };
    // Same signing setup as the feature module.
    const jwtService = new JwtService({
      privateKey: keys.privateKey,
      signOptions: { algorithm: 'RS256', keyid: JWT_KEY_ID },
    });
    service = new AppUsersLoginService(
      users as unknown as AppUsersRepository,
      applications as unknown as ApplicationsRepository,
      userApps as unknown as UserAppsRepository,
      connections as unknown as AppUserConnectionsRepository,
      userRoles as unknown as UserRolesRepository,
      roles as unknown as RolesRepository,
      jwtService,
      config as unknown as ConfigService,
    );

    users.findByClienteId.mockResolvedValue({
      id: 1,
      clienteId: 'client-1',
      clienteSecret: secretHash,
    });
    applications.findByName.mockImplementation(async (name: string) =>
      name === ORIGIN
        ? { id: 10, name: ORIGIN, description: 'Identity' }
        : name === TARGET
          ? { id: 20, name: TARGET, description: 'Tickets' }
          : null,
    );
    userApps.existsForAppUserAndApplication.mockResolvedValue(true);
    connections.existsForAppUserAndApplications.mockResolvedValue(true);
    userRoles.findRoleIdsForAppUserAndApplication.mockResolvedValue([100, 101]);
    roles.findByIds.mockResolvedValue([
      { id: 100, applicationId: 20, name: 'ADMIN', description: 'Admin' },
      { id: 101, applicationId: 20, name: 'VIEWER', description: 'Viewer' },
    ]);
    config.get.mockReturnValue('1h');
  });

  const decode = (token: string) =>
    new JwtService({ publicKey: keys.publicKey }).verify(token, {
      algorithms: ['RS256'],
    });

  describe('credentials', () => {
    it('throws Unauthorized for an unknown user', async () => {
      users.findByClienteId.mockResolvedValue(null);

      await expect(
        service.login(
          { clienteId: 'ghost', clienteSecret: 'right-secret' },
          ORIGIN,
          TARGET,
        ),
      ).rejects.toThrow(new UnauthorizedException('Invalid credentials'));
      expect(users.findByClienteId).toHaveBeenCalledWith('ghost');
    });

    it('throws Unauthorized for a wrong clienteSecret', async () => {
      await expect(
        service.login(
          { clienteId: 'client-1', clienteSecret: 'wrong' },
          ORIGIN,
          TARGET,
        ),
      ).rejects.toThrow(new UnauthorizedException('Invalid credentials'));
    });

    it('answers the same message for an unknown user and a wrong clienteSecret', async () => {
      users.findByClienteId.mockResolvedValueOnce(null);
      const unknown = await service
        .login(
          { clienteId: 'ghost', clienteSecret: 'right-secret' },
          ORIGIN,
          TARGET,
        )
        .catch((e) => e);
      const wrong = await service
        .login(
          { clienteId: 'client-1', clienteSecret: 'wrong' },
          ORIGIN,
          TARGET,
        )
        .catch((e) => e);

      expect(unknown.message).toBe(wrong.message);
    });

    it('does not look the applications up when the credentials are wrong', async () => {
      await service
        .login(
          { clienteId: 'client-1', clienteSecret: 'wrong' },
          ORIGIN,
          TARGET,
        )
        .catch(() => undefined);

      expect(applications.findByName).not.toHaveBeenCalled();
    });
  });

  describe('applications', () => {
    it('throws NotFound when the origin application does not exist', async () => {
      await expect(service.login(dto, 'ghost', TARGET)).rejects.toThrow(
        new NotFoundException('Application not found'),
      );
    });

    it('throws NotFound when the target application does not exist', async () => {
      await expect(service.login(dto, ORIGIN, 'ghost')).rejects.toThrow(
        new NotFoundException('Application not found'),
      );
    });

    it('looks the origin and the target up by name', async () => {
      await service.login(dto, ORIGIN, TARGET);

      expect(applications.findByName).toHaveBeenCalledWith(ORIGIN);
      expect(applications.findByName).toHaveBeenCalledWith(TARGET);
    });
  });

  describe('access rules', () => {
    it('throws Forbidden when the user has no access to the origin application', async () => {
      userApps.existsForAppUserAndApplication.mockResolvedValueOnce(false);

      await expect(service.login(dto, ORIGIN, TARGET)).rejects.toThrow(
        new ForbiddenException('No access to this application'),
      );
      expect(userApps.existsForAppUserAndApplication).toHaveBeenNthCalledWith(
        1,
        1,
        10,
      );
    });

    it('throws Forbidden when the user has no access to the target application', async () => {
      userApps.existsForAppUserAndApplication
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      await expect(service.login(dto, ORIGIN, TARGET)).rejects.toThrow(
        new ForbiddenException('No access to this application'),
      );
      expect(userApps.existsForAppUserAndApplication).toHaveBeenNthCalledWith(
        2,
        1,
        20,
      );
    });

    it('throws Forbidden when there is no connection from origin to target', async () => {
      connections.existsForAppUserAndApplications.mockResolvedValue(false);

      await expect(service.login(dto, ORIGIN, TARGET)).rejects.toThrow(
        new ForbiddenException(
          'No connection allowed between these applications',
        ),
      );
      expect(connections.existsForAppUserAndApplications).toHaveBeenCalledWith(
        1,
        10,
        20,
      );
    });

    it('throws Forbidden when the user has no role in the target application', async () => {
      userRoles.findRoleIdsForAppUserAndApplication.mockResolvedValue([]);

      await expect(service.login(dto, ORIGIN, TARGET)).rejects.toThrow(
        new ForbiddenException('No access to this application'),
      );
      expect(
        userRoles.findRoleIdsForAppUserAndApplication,
      ).toHaveBeenCalledWith(1, 20);
      expect(roles.findByIds).not.toHaveBeenCalled();
    });
  });

  describe('token', () => {
    it('returns a ResponseLogin carrying the access token', async () => {
      const response = await service.login(dto, ORIGIN, TARGET);

      expect(response).toBeInstanceOf(ResponseLogin);
      expect(response.access_token.split('.')).toHaveLength(3);
    });

    it('loads the roles by the ids found for the target application', async () => {
      await service.login(dto, ORIGIN, TARGET);

      expect(roles.findByIds).toHaveBeenCalledWith([100, 101]);
    });

    it('signs the token with RS256 and the current key id', async () => {
      const { access_token } = await service.login(dto, ORIGIN, TARGET);

      const header = JSON.parse(
        Buffer.from(access_token.split('.')[0], 'base64url').toString(),
      );
      expect(header).toMatchObject({ alg: 'RS256', kid: JWT_KEY_ID });
    });

    it('can be verified with the matching public key', async () => {
      const { access_token } = await service.login(dto, ORIGIN, TARGET);

      expect(() => decode(access_token)).not.toThrow();
    });

    it('puts the user id as subject and its identifier in the claims', async () => {
      const { access_token } = await service.login(dto, ORIGIN, TARGET);

      expect(decode(access_token)).toMatchObject({
        sub: 1,
        clienteId: 'client-1',
      });
    });

    it('records the origin application that requested the token', async () => {
      const { access_token } = await service.login(dto, ORIGIN, TARGET);

      expect(decode(access_token).origin).toBe(ORIGIN);
    });

    it('puts the target application and the user roles in the apps claim', async () => {
      const { access_token } = await service.login(dto, ORIGIN, TARGET);

      expect(decode(access_token).apps).toEqual({
        application: {
          id: 20,
          name: TARGET,
          description: 'Tickets',
          roles: [
            { id: 100, name: 'ADMIN', description: 'Admin' },
            { id: 101, name: 'VIEWER', description: 'Viewer' },
          ],
        },
      });
    });

    it('expires after JWT_EXPIRES_IN', async () => {
      config.get.mockReturnValue('2h');

      const { access_token } = await service.login(dto, ORIGIN, TARGET);

      const claims = decode(access_token);
      expect(claims.exp - claims.iat).toBe(7200);
      expect(config.get).toHaveBeenCalledWith('JWT_EXPIRES_IN');
    });

    it('never puts the stored clienteSecret hash nor the plaintext in the token', async () => {
      const { access_token } = await service.login(dto, ORIGIN, TARGET);

      const payload = Buffer.from(
        access_token.split('.')[1],
        'base64url',
      ).toString();
      expect(payload).not.toContain(secretHash);
      expect(payload).not.toContain('right-secret');
    });

    it('allows the same application as origin and target when a connection exists', async () => {
      await expect(service.login(dto, TARGET, TARGET)).resolves.toBeInstanceOf(
        ResponseLogin,
      );
    });
  });
});
