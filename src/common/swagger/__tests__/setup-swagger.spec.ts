import { describe, expect, it } from '@jest/globals';
import { OpenAPIObject } from '@nestjs/swagger';
import { documentErrorEnvelope, ERROR_RESPONSE_SCHEMA_NAME } from '../setup-swagger';

const buildDocument = (): OpenAPIObject => ({
	openapi: '3.0.0',
	info: { title: 't', version: '1' },
	paths: {
		'/a': {
			post: {
				responses: {
					'201': { description: 'created' },
					'404': { description: 'not found' },
					'409': { description: 'own body', content: { 'text/plain': {} } },
				},
			},
		},
	},
});

describe('documentErrorEnvelope', () => {
	it('registers the error envelope schema with ok, msg and data', () => {
		const document = documentErrorEnvelope(buildDocument());

		expect(document.components?.schemas?.[ERROR_RESPONSE_SCHEMA_NAME]).toMatchObject({
			required: ['ok', 'msg', 'data'],
			properties: { ok: expect.anything(), msg: expect.anything(), data: expect.anything() },
		});
	});

	it('references the schema on error responses without a body', () => {
		const document = documentErrorEnvelope(buildDocument());
		const responses = (document.paths['/a'] as { post: { responses: Record<string, unknown> } })
			.post.responses;

		expect(responses['404']).toMatchObject({
			content: {
				'application/json': {
					schema: { $ref: `#/components/schemas/${ERROR_RESPONSE_SCHEMA_NAME}` },
				},
			},
		});
	});

	it('leaves success responses and responses with their own body untouched', () => {
		const document = documentErrorEnvelope(buildDocument());
		const responses = (document.paths['/a'] as { post: { responses: Record<string, unknown> } })
			.post.responses;

		expect(responses['201']).toEqual({ description: 'created' });
		expect(responses['409']).toEqual({ description: 'own body', content: { 'text/plain': {} } });
	});
});
