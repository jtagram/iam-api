import { describe, expect, it } from '@jest/globals';
import { buildLoggerOptions } from '../logger.config';

describe('buildLoggerOptions', () => {
  it('uses the given level', () => {
    expect(buildLoggerOptions('warn').pinoHttp.level).toBe('warn');
  });

  it('generates a UUID request id per call', () => {
    const { pinoHttp } = buildLoggerOptions('info');
    const genReqId = pinoHttp.genReqId as () => string;

    const first = genReqId();
    const second = genReqId();

    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(second).not.toBe(first);
  });

  it('redacts the authorization header', () => {
    const redact = buildLoggerOptions('info').pinoHttp.redact as {
      paths: string[];
    };

    expect(redact.paths).toContain('req.headers.authorization');
  });

  it('redacts cookies in both directions', () => {
    const redact = buildLoggerOptions('info').pinoHttp.redact as {
      paths: string[];
    };

    expect(redact.paths).toContain('req.headers.cookie');
    expect(redact.paths).toContain('res.headers["set-cookie"]');
  });

  it('redacts the cliente secret and the access token of request bodies', () => {
    const redact = buildLoggerOptions('info').pinoHttp.redact as {
      paths: string[];
    };

    expect(redact.paths).toContain('req.body.clienteSecret');
    expect(redact.paths).toContain('req.body.access_token');
  });

  it('redacts database error parameters', () => {
    const redact = buildLoggerOptions('info').pinoHttp.redact as {
      paths: string[];
    };

    expect(redact.paths).toContain('err.parameters');
  });

  it('censors with a fixed marker', () => {
    const redact = buildLoggerOptions('info').pinoHttp.redact as {
      censor: string;
    };

    expect(redact.censor).toBe('[REDACTED]');
  });
});
