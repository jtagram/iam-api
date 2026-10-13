import { describe, expect, it } from '@jest/globals';
import { BadRequestException, ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { ORIGIN_APPLICATION_HEADER, OriginApplication } from '../application-name.decorator';

type Factory = (data: unknown, context: ExecutionContext) => string;

function extractFactory(): Factory {
	class Host {
		handler(@OriginApplication() _name: string) {}
	}
	const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Host, 'handler') as Record<
		string,
		{ factory: Factory }
	>;
	return Object.values(metadata)[0].factory;
}

function contextWith(headers: Record<string, unknown>): ExecutionContext {
	return {
		switchToHttp: () => ({ getRequest: () => ({ headers }) }),
	} as unknown as ExecutionContext;
}

describe('OriginApplication', () => {
	const factory = extractFactory();

	it('reads the x-origin-application header', () => {
		expect(ORIGIN_APPLICATION_HEADER).toBe('x-origin-application');
	});

	it('returns the header value', () => {
		const context = contextWith({ 'x-origin-application': 'iam' });

		expect(factory(undefined, context)).toBe('iam');
	});

	it('trims surrounding whitespace', () => {
		const context = contextWith({ 'x-origin-application': '  iam  ' });

		expect(factory(undefined, context)).toBe('iam');
	});

	it('uses the first value when the header is repeated', () => {
		const context = contextWith({ 'x-origin-application': ['iam', 'other'] });

		expect(factory(undefined, context)).toBe('iam');
	});

	it('ignores the x-target-application header', () => {
		const context = contextWith({
			'x-origin-application': 'iam',
			'x-target-application': 'ticket-hub',
		});

		expect(factory(undefined, context)).toBe('iam');
	});

	it('throws BadRequest when the header is missing', () => {
		expect(() => factory(undefined, contextWith({}))).toThrow(
			new BadRequestException('x-origin-application header is required'),
		);
	});

	it('throws BadRequest when the header is empty', () => {
		const context = contextWith({ 'x-origin-application': '' });

		expect(() => factory(undefined, context)).toThrow(BadRequestException);
	});

	it('throws BadRequest when the header is only whitespace', () => {
		const context = contextWith({ 'x-origin-application': '   ' });

		expect(() => factory(undefined, context)).toThrow('x-origin-application header is required');
	});

	it('throws BadRequest when the repeated header is an empty list', () => {
		const context = contextWith({ 'x-origin-application': [] });

		expect(() => factory(undefined, context)).toThrow(BadRequestException);
	});
});
