import { describe, expect, it } from '@jest/globals';
import { EnvironmentVariables, validate } from '../env.validation';

const validEnv = (): Record<string, unknown> => ({
  POSTGRES_USER: 'user',
  POSTGRES_PASSWORD: 'secret',
  DATABASE_HOST: 'localhost',
  DATABASE_PORT: '5432',
  DATABASE_NAME: 'iam',
  JWT_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----',
  JWT_PUBLIC_KEY: '-----BEGIN PUBLIC KEY-----',
  JWT_EXPIRES_IN: '1h',
  PORT: '3000',
  LOG_LEVEL: 'info',
  IAM_APPLICATION_NAME: 'iam',
});

const without = (key: string): Record<string, unknown> => {
  const env = validEnv();
  delete env[key];
  return env;
};

describe('validate (environment variables)', () => {
  it('returns an EnvironmentVariables instance for a valid environment', () => {
    const result = validate(validEnv());

    expect(result).toBeInstanceOf(EnvironmentVariables);
    expect(result.PORT).toBe('3000');
    expect(result.DATABASE_NAME).toBe('iam');
  });

  it('accepts "trace" as LOG_LEVEL', () => {
    expect(() => validate({ ...validEnv(), LOG_LEVEL: 'trace' })).not.toThrow();
  });

  it('accepts "fatal" as LOG_LEVEL', () => {
    expect(() => validate({ ...validEnv(), LOG_LEVEL: 'fatal' })).not.toThrow();
  });

  it('ignores variables it does not know about', () => {
    expect(() =>
      validate({ ...validEnv(), SOMETHING_ELSE: 'x' }),
    ).not.toThrow();
  });

  it('reports every invalid variable at once', () => {
    const env = { ...validEnv(), PORT: 'abc', LOG_LEVEL: 'verbose' };

    expect(() => validate(env)).toThrow(
      'Missing required environment variable(s): PORT, LOG_LEVEL',
    );
  });

  it('throws when POSTGRES_USER is missing', () => {
    expect(() => validate(without('POSTGRES_USER'))).toThrow(
      'Missing required environment variable(s): POSTGRES_USER',
    );
  });

  it('throws when POSTGRES_USER is empty', () => {
    expect(() => validate({ ...validEnv(), POSTGRES_USER: '' })).toThrow(
      'POSTGRES_USER',
    );
  });

  it('throws when POSTGRES_PASSWORD is missing', () => {
    expect(() => validate(without('POSTGRES_PASSWORD'))).toThrow(
      'Missing required environment variable(s): POSTGRES_PASSWORD',
    );
  });

  it('throws when POSTGRES_PASSWORD is empty', () => {
    expect(() => validate({ ...validEnv(), POSTGRES_PASSWORD: '' })).toThrow(
      'POSTGRES_PASSWORD',
    );
  });

  it('throws when DATABASE_HOST is missing', () => {
    expect(() => validate(without('DATABASE_HOST'))).toThrow(
      'Missing required environment variable(s): DATABASE_HOST',
    );
  });

  it('throws when DATABASE_HOST is empty', () => {
    expect(() => validate({ ...validEnv(), DATABASE_HOST: '' })).toThrow(
      'DATABASE_HOST',
    );
  });

  it('throws when DATABASE_PORT is missing', () => {
    expect(() => validate(without('DATABASE_PORT'))).toThrow('DATABASE_PORT');
  });

  it('throws when DATABASE_PORT is not numeric', () => {
    expect(() => validate({ ...validEnv(), DATABASE_PORT: '54x2' })).toThrow(
      'DATABASE_PORT',
    );
  });

  it('throws when DATABASE_NAME is missing', () => {
    expect(() => validate(without('DATABASE_NAME'))).toThrow(
      'Missing required environment variable(s): DATABASE_NAME',
    );
  });

  it('throws when DATABASE_NAME is empty', () => {
    expect(() => validate({ ...validEnv(), DATABASE_NAME: '' })).toThrow(
      'DATABASE_NAME',
    );
  });

  it('throws when JWT_PRIVATE_KEY is missing', () => {
    expect(() => validate(without('JWT_PRIVATE_KEY'))).toThrow(
      'Missing required environment variable(s): JWT_PRIVATE_KEY',
    );
  });

  it('throws when JWT_PRIVATE_KEY is empty', () => {
    expect(() => validate({ ...validEnv(), JWT_PRIVATE_KEY: '' })).toThrow(
      'JWT_PRIVATE_KEY',
    );
  });

  it('throws when JWT_PUBLIC_KEY is missing', () => {
    expect(() => validate(without('JWT_PUBLIC_KEY'))).toThrow(
      'Missing required environment variable(s): JWT_PUBLIC_KEY',
    );
  });

  it('throws when JWT_PUBLIC_KEY is empty', () => {
    expect(() => validate({ ...validEnv(), JWT_PUBLIC_KEY: '' })).toThrow(
      'JWT_PUBLIC_KEY',
    );
  });

  it('throws when JWT_EXPIRES_IN is missing', () => {
    expect(() => validate(without('JWT_EXPIRES_IN'))).toThrow(
      'Missing required environment variable(s): JWT_EXPIRES_IN',
    );
  });

  it('throws when JWT_EXPIRES_IN is empty', () => {
    expect(() => validate({ ...validEnv(), JWT_EXPIRES_IN: '' })).toThrow(
      'JWT_EXPIRES_IN',
    );
  });

  it('accepts any non-empty JWT_EXPIRES_IN string, even a nonsensical one (current behavior)', () => {
    expect(() =>
      validate({ ...validEnv(), JWT_EXPIRES_IN: 'whenever' }),
    ).not.toThrow();
  });

  it('throws when PORT is missing', () => {
    expect(() => validate(without('PORT'))).toThrow(
      'Missing required environment variable(s): PORT',
    );
  });

  it('throws when PORT is not numeric', () => {
    expect(() => validate({ ...validEnv(), PORT: 'abc' })).toThrow('PORT');
  });

  it('throws when PORT is a real number instead of a numeric string', () => {
    expect(() => validate({ ...validEnv(), PORT: 3000 })).toThrow('PORT');
  });

  it('throws when LOG_LEVEL is missing', () => {
    expect(() => validate(without('LOG_LEVEL'))).toThrow('LOG_LEVEL');
  });

  it('throws when LOG_LEVEL is not a pino level', () => {
    expect(() => validate({ ...validEnv(), LOG_LEVEL: 'verbose' })).toThrow(
      'LOG_LEVEL',
    );
  });

  it('throws when LOG_LEVEL has a different case', () => {
    expect(() => validate({ ...validEnv(), LOG_LEVEL: 'INFO' })).toThrow(
      'LOG_LEVEL',
    );
  });

  it('throws when IAM_APPLICATION_NAME is missing', () => {
    expect(() => validate(without('IAM_APPLICATION_NAME'))).toThrow(
      'Missing required environment variable(s): IAM_APPLICATION_NAME',
    );
  });

  it('throws when IAM_APPLICATION_NAME is empty', () => {
    expect(() => validate({ ...validEnv(), IAM_APPLICATION_NAME: '' })).toThrow(
      'IAM_APPLICATION_NAME',
    );
  });
});
