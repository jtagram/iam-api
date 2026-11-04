import { describe, expect, it } from '@jest/globals';
import { validateBody, validationMessages } from '../../../../../test/helpers/validation';
import { CreateInternalUserDto } from '../../dto/create-internal-user.dto';

describe('CreateInternalUserDto', () => {
	it('accepts a complete user', async () => {
		const dto = await validateBody(CreateInternalUserDto, {
			name: 'Ada',
			lastname: 'Lovelace',
			email: 'ada@example.com',
			password: 'correct-horse',
		});

		expect(dto).toBeInstanceOf(CreateInternalUserDto);
		expect(dto.email).toBe('ada@example.com');
	});

	it('accepts a password of exactly 8 characters', async () => {
		const dto = await validateBody(CreateInternalUserDto, {
			name: 'Ada',
			lastname: 'L',
			email: 'a@example.com',
			password: 'x'.repeat(8),
		});

		expect(dto).toBeInstanceOf(CreateInternalUserDto);
	});

	it('accepts a password of exactly 72 characters', async () => {
		const dto = await validateBody(CreateInternalUserDto, {
			name: 'Ada',
			lastname: 'L',
			email: 'a@example.com',
			password: 'x'.repeat(72),
		});

		expect(dto).toBeInstanceOf(CreateInternalUserDto);
	});

	it('accepts a name and lastname of exactly 30 characters', async () => {
		const dto = await validateBody(CreateInternalUserDto, {
			name: 'x'.repeat(30),
			lastname: 'y'.repeat(30),
			email: 'a@example.com',
			password: 'x'.repeat(8),
		});

		expect(dto).toBeInstanceOf(CreateInternalUserDto);
	});

	it('rejects a missing name', async () => {
		const messages = await validationMessages(() =>
			validateBody(CreateInternalUserDto, {
				lastname: 'L',
				email: 'a@example.com',
				password: 'x'.repeat(8),
			}),
		);

		expect(messages).toEqual([
			'name must be shorter than or equal to 30 characters',
			'name should not be empty',
			'name must be a string',
		]);
	});

	it('rejects a name longer than 30 characters', async () => {
		const messages = await validationMessages(() =>
			validateBody(CreateInternalUserDto, {
				name: 'x'.repeat(31),
				lastname: 'L',
				email: 'a@example.com',
				password: 'x'.repeat(8),
			}),
		);

		expect(messages).toEqual(['name must be shorter than or equal to 30 characters']);
	});

	it('rejects a lastname longer than 30 characters', async () => {
		const messages = await validationMessages(() =>
			validateBody(CreateInternalUserDto, {
				name: 'A',
				lastname: 'y'.repeat(31),
				email: 'a@example.com',
				password: 'x'.repeat(8),
			}),
		);

		expect(messages).toEqual(['lastname must be shorter than or equal to 30 characters']);
	});

	it('rejects an empty name', async () => {
		const messages = await validationMessages(() =>
			validateBody(CreateInternalUserDto, {
				name: '',
				lastname: 'L',
				email: 'a@example.com',
				password: 'x'.repeat(8),
			}),
		);

		expect(messages).toEqual(['name should not be empty']);
	});

	it('rejects an empty lastname', async () => {
		const messages = await validationMessages(() =>
			validateBody(CreateInternalUserDto, {
				name: 'A',
				lastname: '',
				email: 'a@example.com',
				password: 'x'.repeat(8),
			}),
		);

		expect(messages).toEqual(['lastname should not be empty']);
	});

	it('rejects a missing lastname', async () => {
		const messages = await validationMessages(() =>
			validateBody(CreateInternalUserDto, {
				name: 'A',
				email: 'a@example.com',
				password: 'x'.repeat(8),
			}),
		);

		expect(messages).toEqual([
			'lastname must be shorter than or equal to 30 characters',
			'lastname should not be empty',
			'lastname must be a string',
		]);
	});

	it('rejects an invalid email', async () => {
		const messages = await validationMessages(() =>
			validateBody(CreateInternalUserDto, {
				name: 'A',
				lastname: 'L',
				email: 'not-an-email',
				password: 'x'.repeat(8),
			}),
		);

		expect(messages).toEqual(['email must be an email']);
	});

	it('rejects a missing email', async () => {
		const messages = await validationMessages(() =>
			validateBody(CreateInternalUserDto, {
				name: 'A',
				lastname: 'L',
				password: 'x'.repeat(8),
			}),
		);

		expect(messages).toEqual([
			'email must be shorter than or equal to 30 characters',
			'email must be an email',
			'email should not be empty',
			'email must be a string',
		]);
	});

	it('rejects an email longer than 30 characters', async () => {
		const messages = await validationMessages(() =>
			validateBody(CreateInternalUserDto, {
				name: 'A',
				lastname: 'L',
				email: `${'x'.repeat(25)}@example.com`,
				password: 'x'.repeat(8),
			}),
		);

		expect(messages).toEqual(['email must be shorter than or equal to 30 characters']);
	});

	it('rejects a password shorter than 8 characters', async () => {
		const messages = await validationMessages(() =>
			validateBody(CreateInternalUserDto, {
				name: 'A',
				lastname: 'L',
				email: 'a@example.com',
				password: 'x'.repeat(7),
			}),
		);

		expect(messages).toEqual(['password must be longer than or equal to 8 characters']);
	});

	it('rejects a password longer than 72 characters (bcrypt limit)', async () => {
		const messages = await validationMessages(() =>
			validateBody(CreateInternalUserDto, {
				name: 'A',
				lastname: 'L',
				email: 'a@example.com',
				password: 'x'.repeat(73),
			}),
		);

		expect(messages).toEqual(['password must be shorter than or equal to 72 characters']);
	});

	it('rejects a missing password', async () => {
		const messages = await validationMessages(() =>
			validateBody(CreateInternalUserDto, {
				name: 'A',
				lastname: 'L',
				email: 'a@example.com',
			}),
		);

		expect(messages).toEqual([
			'password must be shorter than or equal to 72 characters',
			'password must be longer than or equal to 8 characters',
			'password should not be empty',
			'password must be a string',
		]);
	});

	it('strips unknown properties', async () => {
		const dto = await validateBody(CreateInternalUserDto, {
			name: 'A',
			lastname: 'L',
			email: 'a@example.com',
			password: 'x'.repeat(8),
			role: 'ADMIN',
		});

		expect(dto).toBeInstanceOf(CreateInternalUserDto);
		expect(dto).not.toHaveProperty('role');
	});
});
