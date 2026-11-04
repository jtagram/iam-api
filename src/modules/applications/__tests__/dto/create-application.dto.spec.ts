import { describe, expect, it } from '@jest/globals';
import { validateBody, validationMessages } from '../../../../../test/helpers/validation';
import { CreateApplicationDto } from '../../dto/create-application.dto';

describe('CreateApplicationDto', () => {
	it('accepts a name and a description', async () => {
		const dto = await validateBody(CreateApplicationDto, {
			name: 'iam',
			description: 'Identity',
		});

		expect(dto).toBeInstanceOf(CreateApplicationDto);
		expect(dto).toEqual({ name: 'iam', description: 'Identity' });
	});

	it('accepts a name of exactly 30 characters', async () => {
		const dto = await validateBody(CreateApplicationDto, {
			name: 'x'.repeat(30),
			description: 'd',
		});

		expect(dto).toBeInstanceOf(CreateApplicationDto);
	});

	it('accepts a description of exactly 200 characters', async () => {
		const dto = await validateBody(CreateApplicationDto, {
			name: 'iam',
			description: 'x'.repeat(200),
		});

		expect(dto).toBeInstanceOf(CreateApplicationDto);
	});

	it('rejects an empty name', async () => {
		const messages = await validationMessages(() =>
			validateBody(CreateApplicationDto, { name: '', description: 'd' }),
		);

		expect(messages).toEqual(['name should not be empty']);
	});

	it('rejects an empty description', async () => {
		const messages = await validationMessages(() =>
			validateBody(CreateApplicationDto, { name: 'iam', description: '' }),
		);

		expect(messages).toEqual(['description should not be empty']);
	});

	it('rejects a missing name', async () => {
		const messages = await validationMessages(() =>
			validateBody(CreateApplicationDto, { description: 'd' }),
		);

		expect(messages).toEqual([
			'name must be shorter than or equal to 30 characters',
			'name should not be empty',
			'name must be a string',
		]);
	});

	it('rejects a non-string name', async () => {
		const messages = await validationMessages(() =>
			validateBody(CreateApplicationDto, { name: 5, description: 'd' }),
		);

		expect(messages).toEqual([
			'name must be shorter than or equal to 30 characters',
			'name must be a string',
		]);
	});

	it('rejects a name longer than 30 characters', async () => {
		const messages = await validationMessages(() =>
			validateBody(CreateApplicationDto, {
				name: 'x'.repeat(31),
				description: 'd',
			}),
		);

		expect(messages).toEqual(['name must be shorter than or equal to 30 characters']);
	});

	it('rejects a missing description', async () => {
		const messages = await validationMessages(() =>
			validateBody(CreateApplicationDto, { name: 'iam' }),
		);

		expect(messages).toEqual([
			'description must be shorter than or equal to 200 characters',
			'description should not be empty',
			'description must be a string',
		]);
	});

	it('rejects a description longer than 200 characters', async () => {
		const messages = await validationMessages(() =>
			validateBody(CreateApplicationDto, {
				name: 'iam',
				description: 'x'.repeat(201),
			}),
		);

		expect(messages).toEqual(['description must be shorter than or equal to 200 characters']);
	});

	it('strips unknown properties', async () => {
		const dto = await validateBody(CreateApplicationDto, {
			name: 'iam',
			description: 'd',
			id: 99,
		});

		expect(dto).toBeInstanceOf(CreateApplicationDto);
		expect(dto).toEqual({ name: 'iam', description: 'd' });
	});
});
