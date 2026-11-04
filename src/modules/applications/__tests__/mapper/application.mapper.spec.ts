import { describe, expect, it } from '@jest/globals';
import { ApplicationEntity } from '../../../../common/database/application/application.entity';
import { ApplicationMapper } from '../../application.mapper';

describe('ApplicationMapper.toEntity', () => {
	it('builds an entity from the dto', () => {
		const entity = ApplicationMapper.toEntity({
			name: 'iam',
			description: 'Identity',
		});

		expect(entity).toBeInstanceOf(ApplicationEntity);
		expect(entity).toMatchObject({ name: 'iam', description: 'Identity' });
	});

	it('leaves the id unset', () => {
		const entity = ApplicationMapper.toEntity({
			name: 'iam',
			description: 'd',
		});

		expect(entity.id).toBeUndefined();
	});
});

describe('ApplicationMapper.toResponse', () => {
	it('exposes id, name and description', () => {
		const entity = Object.assign(new ApplicationEntity(), {
			id: 4,
			name: 'iam',
			description: 'Identity',
		});

		expect(ApplicationMapper.toResponse(entity)).toEqual({
			id: 4,
			name: 'iam',
			description: 'Identity',
		});
	});
});

describe('ApplicationMapper.toCreateResponse', () => {
	it('wraps the mapped application in a success envelope', () => {
		const entity = Object.assign(new ApplicationEntity(), {
			id: 4,
			name: 'iam',
			description: 'Identity',
		});

		expect(ApplicationMapper.toCreateResponse(entity)).toMatchObject({
			ok: true,
			msg: 'Application created successfully',
			data: { id: 4, name: 'iam', description: 'Identity' },
		});
	});
});

describe('ApplicationMapper.toFindAllResponse', () => {
	it('wraps every mapped application in a success envelope', () => {
		const entities = [
			Object.assign(new ApplicationEntity(), { id: 1, name: 'iam', description: 'a' }),
			Object.assign(new ApplicationEntity(), { id: 2, name: 'crm', description: 'b' }),
		];

		expect(ApplicationMapper.toFindAllResponse(entities)).toMatchObject({
			ok: true,
			msg: 'Applications retrieved successfully',
			data: [
				{ id: 1, name: 'iam', description: 'a' },
				{ id: 2, name: 'crm', description: 'b' },
			],
		});
	});

	it('returns an empty list when there are no applications', () => {
		expect(ApplicationMapper.toFindAllResponse([])).toMatchObject({ ok: true, data: [] });
	});
});
