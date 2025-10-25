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

  it('delegates error reporting to HomeostatReporter', async () => {
    const publisher = new StubPublisher(VALID_CONFIG);
    const reporterSpy = vi
      .spyOn(publisher.reporter, 'reportPublishingError')
      .mockResolvedValue('https://github.com/issues/1');

    const context = { token: VALID_CONFIG.githubToken, email: 'user@example.com' };
    const result = await publisher.reportError(new Error('boom'), context);

    expect(reporterSpy).toHaveBeenCalledTimes(1);
    const [errorArg, contextArg] = reporterSpy.mock.calls[0];
    expect(errorArg).toBeInstanceOf(Error);
    expect(errorArg.message).toBe('boom');
    expect(contextArg).toEqual(context);
    expect(result).toBe('https://github.com/issues/1');

    reporterSpy.mockRestore();
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
