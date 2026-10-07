import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { HttpExceptionFilter } from '../http-exception.filter';

describe('HttpExceptionFilter', () => {
  let logger: { warn: jest.Mock; error: jest.Mock };
  let json: jest.Mock;
  let status: jest.Mock;
  let host: ArgumentsHost;
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    logger = { warn: jest.fn(), error: jest.fn() };
    json = jest.fn();
    status = jest.fn().mockReturnValue({ json });
    host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;
    filter = new HttpExceptionFilter(logger as unknown as Logger);
  });

  it('answers with the status and body of the exception', () => {
    filter.catch(new NotFoundException('Application not found'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      statusCode: 404,
      message: 'Application not found',
      error: 'Not Found',
    });
  });

  it('keeps the validation message array of a BadRequestException', () => {
    filter.catch(new BadRequestException(['name must be a string']), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: ['name must be a string'] }),
    );
  });

  it('logs a 4xx exception as a warning', () => {
    filter.catch(new ConflictException('duplicated'), host);

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('logs a 5xx exception as an error', () => {
    filter.catch(new InternalServerErrorException('boom'), host);

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('logs the status, class name, message and stack', () => {
    const exception = new ConflictException('duplicated');

    filter.catch(exception, host);

    expect(logger.warn).toHaveBeenCalledWith({
      err: { message: 'duplicated', stack: exception.stack },
      errorType: 'ConflictException',
      statusCode: 409,
      details: exception.getResponse(),
      msg: 'HTTP exception',
    });
  });

  it('supports a custom HttpException with a plain-object response', () => {
    filter.catch(new HttpException({ code: 'X' }, 418), host);

    expect(status).toHaveBeenCalledWith(418);
    expect(json).toHaveBeenCalledWith({ code: 'X' });
  });
});
