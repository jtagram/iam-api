import { describe, expect, it } from '@jest/globals';
import { BadRequestException, ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import {
  APPLICATION_NAME_HEADER,
  ApplicationName,
} from '../application-name.decorator';

type Factory = (data: unknown, context: ExecutionContext) => string;

function extractFactory(): Factory {
  class Host {
    handler(@ApplicationName() _name: string) {}
  }
  const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Host, 'handler');
  return Object.values<{ factory: Factory }>(metadata)[0].factory;
}

function contextWith(headers: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  } as unknown as ExecutionContext;
}

describe('ApplicationName', () => {
  const factory = extractFactory();

  it('reads the x-application-name header', () => {
    expect(APPLICATION_NAME_HEADER).toBe('x-application-name');
  });

  it('returns the header value', () => {
    const context = contextWith({ 'x-application-name': 'iam' });

    expect(factory(undefined, context)).toBe('iam');
  });

  it('trims surrounding whitespace', () => {
    const context = contextWith({ 'x-application-name': '  iam  ' });

    expect(factory(undefined, context)).toBe('iam');
  });

  it('uses the first value when the header is repeated', () => {
    const context = contextWith({ 'x-application-name': ['iam', 'other'] });

    expect(factory(undefined, context)).toBe('iam');
  });

  it('ignores the x-target-application header', () => {
    const context = contextWith({
      'x-application-name': 'iam',
      'x-target-application': 'ticket-hub',
    });

    expect(factory(undefined, context)).toBe('iam');
  });

  it('throws BadRequest when the header is missing', () => {
    expect(() => factory(undefined, contextWith({}))).toThrow(
      new BadRequestException('x-application-name header is required'),
    );
  });

  it('throws BadRequest when the header is empty', () => {
    const context = contextWith({ 'x-application-name': '' });

    expect(() => factory(undefined, context)).toThrow(BadRequestException);
  });

  it('throws BadRequest when the header is only whitespace', () => {
    const context = contextWith({ 'x-application-name': '   ' });

    expect(() => factory(undefined, context)).toThrow(
      'x-application-name header is required',
    );
  });

  it('throws BadRequest when the repeated header is an empty list', () => {
    const context = contextWith({ 'x-application-name': [] });

    expect(() => factory(undefined, context)).toThrow(BadRequestException);
  });
});
