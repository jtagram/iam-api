import { describe, expect, it } from '@jest/globals';
import { CallHandler, ClassSerializerInterceptor, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { instanceToPlain } from 'class-transformer';
import { lastValueFrom, of } from 'rxjs';
import { ResponseBody } from '../../dto/response-body.dto';
import { AppUserEntity } from '../app-user/app-user.entity';
import { InternalUserAppEntity } from '../internal-user/internal-user-app.entity';
import { InternalUserEntity } from '../internal-user/internal-user.entity';
import { UserAppEntity } from '../user-application/user-app.entity';

const SECRET_KEYS = /password|clienteSecret/;

const internalUser = () =>
	Object.assign(new InternalUserEntity(), {
		id: 1,
		name: 'Ada',
		lastname: 'Lovelace',
		email: 'ada@example.com',
		password: '$2b$10$hash',
		applications: [] as InternalUserAppEntity[],
	});

const appUser = () =>
	Object.assign(new AppUserEntity(), {
		id: 2,
		clienteId: 'client-1',
		clienteSecret: '$2b$10$hash',
		name: 'Billing',
		description: 'Billing service',
		applications: [] as UserAppEntity[],
	});

// The same interceptor registered globally as APP_INTERCEPTOR in AppModule.
async function serialize(body: unknown): Promise<unknown> {
	const interceptor = new ClassSerializerInterceptor(new Reflector());
	const context = {
		getHandler: () => () => undefined,
		getClass: () => class Fake {},
	} as unknown as ExecutionContext;
	const next: CallHandler = { handle: () => of(body) };
	return lastValueFrom(interceptor.intercept(context, next));
}

describe('secret columns are never serialized', () => {
	it('drops InternalUserEntity.password from the plain form', () => {
		const plain = instanceToPlain(internalUser());

		expect(plain).not.toHaveProperty('password');
		expect(plain).toMatchObject({ id: 1, email: 'ada@example.com' });
	});

	it('drops AppUserEntity.clienteSecret from the plain form', () => {
		const plain = instanceToPlain(appUser());

		expect(plain).not.toHaveProperty('clienteSecret');
		expect(plain).toMatchObject({ id: 2, clienteId: 'client-1' });
	});

	it('keeps the secrets readable on the entity itself, for credential checks', () => {
		const user = internalUser();
		const app = appUser();

		instanceToPlain(user);
		instanceToPlain(app);

		expect(user.password).toBe('$2b$10$hash');
		expect(app.clienteSecret).toBe('$2b$10$hash');
	});

	it('drops the password of users inside an envelope, at any depth', async () => {
		const user = internalUser();
		user.applications = [
			Object.assign(new InternalUserAppEntity(), { id: 9, internalUser: internalUser() }),
		];

		const serialized = await serialize(ResponseBody.success('ok', [user]));

		expect(JSON.stringify(serialized)).not.toMatch(SECRET_KEYS);
		expect(JSON.stringify(serialized)).not.toContain('$2b$10$hash');
		expect(serialized).toMatchObject({ ok: true, msg: 'ok', data: [{ id: 1 }] });
	});

	it('drops the clienteSecret of app users nested in assignment rows', async () => {
		const row = Object.assign(new UserAppEntity(), { id: 4, appUser: appUser(), roles: [] });

		const serialized = await serialize(ResponseBody.success('ok', [row]));

		expect(JSON.stringify(serialized)).not.toMatch(SECRET_KEYS);
		expect(serialized).toMatchObject({
			data: [{ id: 4, appUser: { id: 2, clienteId: 'client-1' }, roles: [] }],
		});
	});

	it('leaves the plain response DTOs and the error envelope untouched', async () => {
		const failure = ResponseBody.failure('boom');

		await expect(serialize(failure)).resolves.toEqual({ ok: false, msg: 'boom', data: null });
	});
});
