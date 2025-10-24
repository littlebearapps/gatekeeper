import { describe, expect, it, vi } from 'vitest';
import { BasePublisher } from '../../../src/publishers/base.js';
import { ValidationError } from '../../../src/core/errors.js';
const VALID_CONFIG = {
  githubToken: `ghp_${'a'.repeat(36)}`,
  repo: 'littlebearapps/gatekeeper',
  browsers: ['chrome', 'firefox'],
  credentials: {
    chrome: {
      publisherId: 'pub-123',
      itemId: 'item-456',
      wifConfig: { projectId: 'lba-gcp' }
    },
    firefox: {
      apiKey: 'amo-key',
      apiSecret: 'amo-secret'
    }
  }
};

class StubPublisher extends BasePublisher {}

describe('BasePublisher', () => {
  it('throws Not implemented for abstract methods', async () => {
    const publisher = new StubPublisher(VALID_CONFIG);

    await expect(publisher.validate()).rejects.toThrow('Not implemented');
    await expect(publisher.package()).rejects.toThrow('Not implemented');
    await expect(publisher.upload()).rejects.toThrow('Not implemented');
    await expect(publisher.publish()).rejects.toThrow('Not implemented');
    await expect(publisher.cancel()).rejects.toThrow('Not implemented');
  });

  it('sanitizes logs by removing sensitive patterns', async () => {
    const publisher = new StubPublisher(VALID_CONFIG);
    const logs = [
      'Token ghp_abcdefghijklmnopqrstuvwxyz123456',
      'Chrome CWS_SECRET',
      'Firefox AMO_SECRET',
      'Edge EDGE_SECRET',
      'Email user@example.com',
      `Generic ${'A'.repeat(40)}`
    ].join(' ');
    const sanitized = await publisher.sanitizeLogs(logs);

    expect(sanitized).not.toContain('ghp_abcdefghijklmnopqrstuvwxyz123456');
    expect(sanitized).not.toContain('user@example.com');
    expect(sanitized).not.toContain('CWS_SECRET');
    expect(sanitized).not.toContain('AMO_SECRET');
    expect(sanitized).not.toContain('EDGE_SECRET');
    expect(sanitized).toContain('[REDACTED_GITHUB_TOKEN]');
    expect(sanitized).toContain('[REDACTED_TOKEN]');
    expect(sanitized).toContain('[REDACTED_EMAIL]');
    expect(sanitized).toContain('[REDACTED_CWS_CREDENTIAL]');
    expect(sanitized).toContain('[REDACTED_AMO_CREDENTIAL]');
    expect(sanitized).toContain('[REDACTED_EDGE_CREDENTIAL]');
  });

  it('logs sanitized error context', async () => {
    const publisher = new StubPublisher(VALID_CONFIG);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await publisher.reportError(new Error('boom'), { token: VALID_CONFIG.githubToken, email: 'user@example.com' });
      expect(spy).toHaveBeenCalledTimes(1);
      const [, message, context] = spy.mock.calls[0];
      expect(message).toBe('boom');
      expect(context).toContain('[REDACTED_GITHUB_TOKEN]');
      expect(context).not.toContain(VALID_CONFIG.githubToken);
      expect(context).not.toContain('user@example.com');
      expect(context).toContain('[REDACTED_EMAIL]');
    } finally {
      spy.mockRestore();
    }
  });

  it('sanitizes structured log objects by stringifying them', async () => {
    const publisher = new StubPublisher(VALID_CONFIG);
    const logs = {
      chrome: { credential: 'CWS_SECRET' },
      rawToken: 'ghp_abcdefghijklmnopqrstuvwxyz123456'
    };

    const sanitized = await publisher.sanitizeLogs(logs);

    expect(typeof sanitized).toBe('string');
    expect(sanitized).toContain('[REDACTED_CWS_CREDENTIAL]');
    expect(sanitized).toContain('[REDACTED_GITHUB_TOKEN]');
    expect(sanitized).not.toContain('CWS_SECRET');
  });

  it('wraps constructor validation errors as ValidationError', () => {
    expect(() => new StubPublisher({})).toThrowError(ValidationError);
  });
});
