import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ArgumentsHost } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { GENERIC_ERROR_MESSAGE } from '../generic-error-message';
import { UnknownExceptionFilter } from '../unknown-exception.filter';

describe('UnknownExceptionFilter', () => {
  let logger: { error: jest.Mock };
  let json: jest.Mock;
  let status: jest.Mock;
  let host: ArgumentsHost;
  let filter: UnknownExceptionFilter;

  beforeEach(() => {
    logger = { error: jest.fn() };
    json = jest.fn();
    status = jest.fn().mockReturnValue({ json });
    host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;
    filter = new UnknownExceptionFilter(logger as unknown as Logger);
  });

  it('answers 500 with the generic message for an Error', () => {
    filter.catch(new Error('secret internal detail'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      statusCode: 500,
      message: GENERIC_ERROR_MESSAGE,
    });
  });

  it('does not leak the original error message to the client', () => {
    filter.catch(new Error('secret internal detail'), host);

    expect(JSON.stringify(json.mock.calls)).not.toContain('secret');
  });

  it('logs message, stack and class name of an Error subclass', () => {
    const error = new RangeError('out of range');

    filter.catch(error, host);

    expect(logger.error).toHaveBeenCalledWith({
      err: { message: 'out of range', stack: error.stack },
      errorType: 'RangeError',
      msg: 'Unhandled exception',
    });
  });

  it('handles a thrown string', () => {
    filter.catch('plain string', host);

    expect(logger.error).toHaveBeenCalledWith({
      err: { message: 'plain string', stack: undefined },
      errorType: 'string',
      msg: 'Unhandled exception',
    });
    expect(status).toHaveBeenCalledWith(500);
  });

  it('handles a thrown undefined', () => {
    filter.catch(undefined, host);

    expect(logger.error).toHaveBeenCalledWith({
      err: { message: 'undefined', stack: undefined },
      errorType: 'undefined',
      msg: 'Unhandled exception',
    });
  });

  it('handles a thrown plain object', () => {
    filter.catch({ code: 1 }, host);

    expect(logger.error.mock.calls[0][0]).toMatchObject({
      errorType: 'object',
    });
    expect(json).toHaveBeenCalledWith({
      statusCode: 500,
      message: GENERIC_ERROR_MESSAGE,
    });
  });
});
