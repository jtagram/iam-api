import { describe, expect, it } from '@jest/globals';
import { BadRequestException, ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import {
  TARGET_APPLICATION_HEADER,
  TargetApplication,
} from '../application-name.decorator';

type Factory = (data: unknown, context: ExecutionContext) => string;

function extractFactory(): Factory {
  class Host {
    handler(@TargetApplication() _name: string) {}
  }
  const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Host, 'handler');
  return Object.values<{ factory: Factory }>(metadata)[0].factory;
}

function contextWith(headers: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  } as unknown as ExecutionContext;
}

describe('TargetApplication', () => {
  const factory = extractFactory();

  it('reads the x-target-application header', () => {
    expect(TARGET_APPLICATION_HEADER).toBe('x-target-application');
  });

  it('returns the header value', () => {
    const context = contextWith({ 'x-target-application': 'ticket-hub' });

    expect(factory(undefined, context)).toBe('ticket-hub');
  });

  it('trims surrounding whitespace', () => {
    const context = contextWith({ 'x-target-application': ' ticket-hub ' });

    expect(factory(undefined, context)).toBe('ticket-hub');
  });

  it('uses the first value when the header is repeated', () => {
    const context = contextWith({
      'x-target-application': ['ticket-hub', 'other'],
    });

    expect(factory(undefined, context)).toBe('ticket-hub');
  });

  it('ignores the x-application-name header', () => {
    const context = contextWith({
      'x-application-name': 'iam',
      'x-target-application': 'ticket-hub',
    });

    expect(factory(undefined, context)).toBe('ticket-hub');
  });

  it('throws BadRequest when the header is missing', () => {
    expect(() => factory(undefined, contextWith({}))).toThrow(
      new BadRequestException('x-target-application header is required'),
    );
  });

  it('throws BadRequest when the header is only whitespace', () => {
    const context = contextWith({ 'x-target-application': '  ' });

    expect(() => factory(undefined, context)).toThrow(
      'x-target-application header is required',
    );
  });

  it('throws BadRequest when only the origin header is present', () => {
    const context = contextWith({ 'x-application-name': 'iam' });

    expect(() => factory(undefined, context)).toThrow(BadRequestException);
  });
});
