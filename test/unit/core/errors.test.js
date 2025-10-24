import { describe, expect, it } from 'vitest';
import {
  APIError,
  AuthenticationError,
  ERROR_TYPES,
  NetworkError,
  PackagingError,
  PublishingError,
  QuotaExceededError,
  ValidationError
} from '../../../src/core/errors.js';

describe('PublishingError hierarchy', () => {
  it('captures message, context, and timestamp', () => {
    const context = { step: 'validate' };
    const error = new PublishingError('Failed', context);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('PublishingError');
    expect(error.message).toBe('Failed');
    expect(error.context).toBe(context);
    expect(() => new Date(error.timestamp)).not.toThrow();
  });

  it.each([
    ['ValidationError', ValidationError],
    ['APIError', APIError],
    ['NetworkError', NetworkError],
    ['AuthenticationError', AuthenticationError],
    ['QuotaExceededError', QuotaExceededError],
    ['PackagingError', PackagingError]
  ])('exposes %s subtype with correct name', (name, Ctor) => {
    const err = new Ctor('boom');
    expect(err).toBeInstanceOf(PublishingError);
    expect(err.name).toBe(name);
  });
});

describe('ERROR_TYPES', () => {
  it('maps symbolic keys to error class names', () => {
    expect(ERROR_TYPES).toEqual({
      VALIDATION: 'ValidationError',
      API: 'APIError',
      NETWORK: 'NetworkError',
      AUTHENTICATION: 'AuthenticationError',
      QUOTA: 'QuotaExceededError',
      PACKAGING: 'PackagingError'
    });
  });
});
