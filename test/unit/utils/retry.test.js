import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('google-auth-library', () => ({
  GoogleAuth: vi.fn(() => ({
    getAccessToken: vi.fn().mockResolvedValue('ya29.mock-token')
  }))
}), { virtual: true });

const { RetryHandler } = await import('../../../src/utils/retry.js');
const { Sanitizer } = await import('../../../src/utils/sanitize.js');
const { AuthHelper } = await import('../../../src/utils/auth.js');
const {
  APIError,
  AuthenticationError,
  NetworkError,
  QuotaExceededError,
  ValidationError
} = await import('../../../src/core/errors.js');

describe('RetryHandler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('retries on network failures with exponential backoff', async () => {
    const handler = new RetryHandler({ maxAttempts: 3, initialDelay: 100, backoffMultiplier: 2 });
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new NetworkError('temporary issue'))
      .mockResolvedValueOnce('success');

    const promise = handler.execute(() => operation());

    await vi.advanceTimersByTimeAsync(100);

    await expect(promise).resolves.toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('does not retry on validation errors', async () => {
    const handler = new RetryHandler({ maxAttempts: 3 });
    const error = new ValidationError('invalid');

    await expect(handler.execute(async () => {
      throw error;
    })).rejects.toBe(error);
  });

  it('stops after max attempts for quota errors', async () => {
    vi.useRealTimers();
    const handler = new RetryHandler({ maxAttempts: 2, initialDelay: 10 });
    const error = new QuotaExceededError('quota');
    const operation = vi.fn().mockRejectedValue(error);

    await expect(handler.execute(() => operation())).rejects.toBe(error);
    expect(operation).toHaveBeenCalledTimes(2);
    vi.useFakeTimers();
  });

  it('calculates exponential backoff respecting max delay', () => {
    const handler = new RetryHandler({ initialDelay: 100, backoffMultiplier: 3, maxDelay: 5000 });

    expect(handler.calculateDelay(1)).toBe(100);
    expect(handler.calculateDelay(2)).toBe(300);
    expect(handler.calculateDelay(3)).toBe(900);
    expect(handler.calculateDelay(5)).toBe(5000);
    expect(handler.calculateDelay(6)).toBe(5000);
  });

  it('honors abort signals during wait', async () => {
    const handler = new RetryHandler({ maxAttempts: 3, initialDelay: 1000 });
    const controller = new AbortController();
    const operation = vi.fn().mockImplementation(() => {
      throw new NetworkError('offline');
    });

    const promise = handler.execute(() => operation(), { signal: controller.signal });

    await Promise.resolve();
    controller.abort(new Error('cancelled'));
    await expect(promise).rejects.toThrow('cancelled');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('considers 5xx API errors retryable but not 4xx', () => {
    const handler = new RetryHandler();
    const retryable = new APIError('server error', { status: 503 });
    const notRetryable = new APIError('client error', { status: 404 });

    expect(handler.shouldRetry(retryable)).toBe(true);
    expect(handler.shouldRetry(notRetryable)).toBe(false);
  });
});

describe('Sanitizer', () => {
  it('sanitizes sensitive tokens and emails', () => {
    const text = 'Token ghp_abcdefghijklmnopqrstuvwxyz123456 email user@example.com sk-abc123456789defghijkl';
    const sanitized = Sanitizer.sanitize(text);

    expect(sanitized).not.toContain('ghp_abcdefghijklmnopqrstuvwxyz123456');
    expect(sanitized).not.toContain('user@example.com');
    expect(sanitized).toContain('[REDACTED_GITHUB_TOKEN]');
    expect(sanitized).toContain('[REDACTED_EMAIL]');
    expect(sanitized).toContain('[REDACTED_API_KEY]');
  });

  it('sanitizes nested objects without mutating original', () => {
    const original = {
      chrome: { credential: 'CWS_SECRET' },
      github: 'ghp_abcdefghijklmnopqrstuvwxyz123456',
      nested: [{ email: 'user@example.com' }]
    };

    const sanitized = Sanitizer.sanitizeObject(original);

    expect(sanitized).not.toBe(original);
    expect(original.chrome.credential).toBe('CWS_SECRET');
    expect(sanitized.chrome.credential).toBe('[REDACTED_CWS_CREDENTIAL]');
    expect(sanitized.github).toBe('[REDACTED_GITHUB_TOKEN]');
    expect(sanitized.nested[0].email).toBe('[REDACTED_EMAIL]');
  });
});

describe('AuthHelper', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('retrieves Google access tokens using WIF config', async () => {
    const { GoogleAuth } = await import('google-auth-library');
    const token = await AuthHelper.getGoogleAccessToken({ projectId: 'lba', clientEmail: 'svc@example.com' }, ['scope-one']);

    expect(token).toBe('ya29.mock-token');
    expect(GoogleAuth).toHaveBeenCalledWith({
      credentials: { projectId: 'lba', clientEmail: 'svc@example.com' },
      scopes: ['scope-one']
    });
  });

  it('throws authentication error for missing config', async () => {
    await expect(AuthHelper.getGoogleAccessToken(null)).rejects.toBeInstanceOf(AuthenticationError);
  });

  it('validates JWT tokens and detects expiration', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const expiredPayload = Buffer.from(
      JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 10 })
    ).toString('base64url');
    const futurePayload = Buffer.from(
      JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })
    ).toString('base64url');

    const expiredToken = `${header}.${expiredPayload}.signature`;
    const validToken = `${header}.${futurePayload}.signature`;

    expect(AuthHelper.validateToken(expiredToken)).toMatchObject({ valid: false, reason: 'Token has expired.' });
    const result = AuthHelper.validateToken(validToken);
    expect(result.valid).toBe(true);
    expect(result.expiresAt instanceof Date).toBe(true);
  });

  it('rejects tokens with invalid characters or insufficient length', () => {
    expect(AuthHelper.validateToken('short')).toMatchObject({ valid: false });
    expect(AuthHelper.validateToken('token-with spaces')).toMatchObject({ valid: false });
  });
});
