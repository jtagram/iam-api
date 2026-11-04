import { describe, expect, it } from '@jest/globals';
import { validateBody, validationMessages } from '../../../../../test/helpers/validation';
import { CreateAppUserDto } from '../../dto/create-app-user.dto';

describe('CreateAppUserDto', () => {
	it('accepts a name and a description', async () => {
		const dto = await validateBody(CreateAppUserDto, {
			name: 'Billing',
			description: 'Billing service',
		});

		expect(dto).toBeInstanceOf(CreateAppUserDto);
		expect(dto).toEqual({ name: 'Billing', description: 'Billing service' });
	});

	it('accepts a name of exactly 30 characters', async () => {
		const dto = await validateBody(CreateAppUserDto, {
			name: 'x'.repeat(30),
			description: 'd',
		});

		expect(dto).toBeInstanceOf(CreateAppUserDto);
	});

	it('rejects an empty name', async () => {
		const messages = await validationMessages(() =>
			validateBody(CreateAppUserDto, { name: '', description: 'd' }),
		);

		expect(messages).toEqual(['name should not be empty']);
	});

	it('rejects an empty description', async () => {
		const messages = await validationMessages(() =>
			validateBody(CreateAppUserDto, { name: 'n', description: '' }),
		);

		expect(messages).toEqual(['description should not be empty']);
	});

	it('rejects a missing name', async () => {
		const messages = await validationMessages(() =>
			validateBody(CreateAppUserDto, { description: 'd' }),
		);

		expect(messages).toEqual([
			'name must be shorter than or equal to 30 characters',
			'name should not be empty',
			'name must be a string',
		]);
	});

	it('rejects a name longer than 30 characters', async () => {
		const messages = await validationMessages(() =>
			validateBody(CreateAppUserDto, {
				name: 'x'.repeat(31),
				description: 'd',
			}),
		);

		expect(messages).toEqual(['name must be shorter than or equal to 30 characters']);
	});

	it('rejects a missing description', async () => {
		const messages = await validationMessages(() => validateBody(CreateAppUserDto, { name: 'n' }));

		expect(messages).toEqual([
			'description must be shorter than or equal to 200 characters',
			'description should not be empty',
			'description must be a string',
		]);
	});

	it('rejects a description longer than 200 characters', async () => {
		const messages = await validationMessages(() =>
			validateBody(CreateAppUserDto, {
				name: 'n',
				description: 'x'.repeat(201),
			}),
		);

		expect(messages).toEqual(['description must be shorter than or equal to 200 characters']);
	});

	it('strips unknown properties such as a caller-chosen clienteId', async () => {
		const dto = await validateBody(CreateAppUserDto, {
			name: 'n',
			description: 'd',
			clienteId: 'mine',
			clienteSecret: 'mine',
		});

		expect(dto).toBeInstanceOf(CreateAppUserDto);
		expect(dto).toEqual({ name: 'n', description: 'd' });
	});
});
