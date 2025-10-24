import { afterEach, describe, expect, it, vi } from 'vitest';

const { createIssueMock, octokitCtorMock } = vi.hoisted(() => {
  const createIssueMock = vi.fn();
  const octokitCtorMock = vi.fn(() => ({
    issues: {
      create: createIssueMock
    }
  }));

  return { createIssueMock, octokitCtorMock };
});

vi.mock('@octokit/rest', () => ({
  Octokit: octokitCtorMock
}));

import { HomeostatReporter } from '../../../src/core/homeostat-reporter.js';

const GITHUB_TOKEN = `ghp_${'a'.repeat(36)}`;

afterEach(() => {
  createIssueMock.mockReset();
  octokitCtorMock.mockClear();
  delete process.env.GITHUB_ACTIONS;
  delete process.env.GITHUB_SERVER_URL;
  delete process.env.GITHUB_REPOSITORY;
  delete process.env.GITHUB_RUN_ID;
  delete process.env.GITHUB_SHA;
});

describe('HomeostatReporter', () => {
  it('creates sanitized Homeostat issues and returns the issue URL', async () => {
    createIssueMock.mockResolvedValue({
      data: { html_url: 'https://github.com/littlebearapps/gatekeeper/issues/42' }
    });

    process.env.GITHUB_ACTIONS = 'true';
    process.env.GITHUB_SERVER_URL = 'https://github.com';
    process.env.GITHUB_REPOSITORY = 'littlebearapps/gatekeeper';
    process.env.GITHUB_RUN_ID = '999';
    process.env.GITHUB_SHA = 'abcdef1234567890';

    const reporter = new HomeostatReporter({
      githubToken: GITHUB_TOKEN,
      repo: 'littlebearapps/gatekeeper'
    });

    const error = new Error(`Validation failed for token ${GITHUB_TOKEN}`);
    error.stack = 'Error: Validation failed\n at Publisher';
    error.apiResponse = { token: 'CWS_SECRET', detail: 'Invalid manifest' };

    const context = {
      extension: 'Convert My File',
      version: '1.2.3',
      store: 'chrome',
      phase: 'validation',
      itemId: 'abc123',
      manifestValidated: true,
      packaged: true,
      packagePath: '/tmp/archive.zip',
      uploaded: true
    };

    const issueUrl = await reporter.reportPublishingError(error, context);

    expect(issueUrl).toBe('https://github.com/littlebearapps/gatekeeper/issues/42');
    expect(octokitCtorMock).toHaveBeenCalledWith({ auth: GITHUB_TOKEN });
    expect(createIssueMock).toHaveBeenCalledTimes(1);

    const [{ owner, repo, title, body, labels }] = createIssueMock.mock.calls[0];
    expect(owner).toBe('littlebearapps');
    expect(repo).toBe('gatekeeper');
    expect(labels).toEqual([
      'robot',
      'convert-my-file',
      'gatekeeper',
      'store:chrome',
      'phase:validation'
    ]);

    expect(title).not.toContain(GITHUB_TOKEN);
    expect(title).toContain('[Convert My File] ValidationError:');

    expect(body).toContain('[REDACTED_GITHUB_TOKEN]');
    expect(body).toContain('[REDACTED_CWS_CREDENTIAL]');
    expect(body).toContain('Run URL: https://github.com/littlebearapps/gatekeeper/actions/runs/999');
    expect(body).toContain('Commit: abcdef1');

    const fingerprintMatch = body.match(/Fingerprint: ([a-f0-9]{12})/);
    expect(fingerprintMatch).not.toBeNull();
  });

  it('classifies errors based on response codes and phases', () => {
    const reporter = new HomeostatReporter({ githubToken: GITHUB_TOKEN, repo: 'owner/repo' });

    expect(reporter.classifyError(new Error('bad manifest'), 'validation')).toBe('ValidationError');
    expect(reporter.classifyError({ code: 'ECONNREFUSED' }, 'upload')).toBe('NetworkError');
    expect(reporter.classifyError({ response: { status: 401 } }, 'publish')).toBe('AuthenticationError');
    expect(reporter.classifyError({ response: { status: 429 } }, 'publish')).toBe('QuotaExceededError');
    expect(reporter.classifyError({ code: 'PACKAGING_FAILED' }, 'package')).toBe('PackagingError');
    expect(reporter.classifyError({ response: { status: 503 } }, 'publish')).toBe('APIError');
    expect(reporter.classifyError(new Error('oops'), 'publish')).toBe('Error');
  });

  it('builds breadcrumbs covering each publishing phase', () => {
    const reporter = new HomeostatReporter({ githubToken: GITHUB_TOKEN, repo: 'owner/repo' });
    const context = reporter.normalizeContext({
      extension: 'Test Extension',
      version: '1.0.0',
      store: 'edge',
      phase: 'upload',
      manifestValidated: true,
      packaged: true,
      packagePath: '/tmp/pkg.zip',
      uploaded: true,
      submitted: true
    });

    const breadcrumbs = reporter.buildBreadcrumbs(context);

    expect(breadcrumbs).toEqual([
      'Started Gatekeeper publish workflow',
      'Loaded extension manifest (Test Extension v1.0.0)',
      'Validated manifest for edge',
      'Packaged extension to /tmp/pkg.zip',
      'Uploaded to edge API',
      'Submitted for review on edge',
      'Publishing failed at upload phase'
    ]);
  });
});
