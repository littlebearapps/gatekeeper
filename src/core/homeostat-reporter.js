import { Octokit } from '@octokit/rest';
import crypto from 'node:crypto';
import { Sanitizer } from '../utils/sanitize.js';

function normalizeExtensionLabel(extension) {
  if (!extension) {
    return 'unknown-extension';
  }

  return extension
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-');
}

function ensureObject(value) {
  if (value == null) {
    return {};
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return { value };
  }
}

function ensureMessage(error) {
  if (!error) {
    return 'Unknown error';
  }

  return typeof error.message === 'string' && error.message.length > 0 ? error.message : String(error);
}

export class HomeostatReporter {
  constructor(config) {
    const { githubToken, repo } = config || {};

    this.octokit = new Octokit({ auth: githubToken });
    this.repo = repo;
  }

  async reportPublishingError(error, context = {}) {
    const normalizedContext = this.normalizeContext(context);
    const errorType = this.classifyError(error, normalizedContext.phase);
    const fingerprint = this.generateFingerprint(error, normalizedContext);
    const breadcrumbs = this.buildBreadcrumbs(normalizedContext);
    const sanitizedMessage = Sanitizer.sanitize(ensureMessage(error));
    const sanitizedStack = Sanitizer.sanitize(error?.stack || '');
    const sanitizedApiResponse = Sanitizer.sanitize(
      JSON.stringify(ensureObject(error?.apiResponse), null, 2)
    );

    const title = `[${normalizedContext.extension}] ${errorType}: ${sanitizedMessage.substring(0, 100)}`;

    const body = `## Error Details
- Extension: ${normalizedContext.extension} v${normalizedContext.version}
- Error Type: ${errorType}
- Message: ${sanitizedMessage}
- Timestamp: ${new Date().toISOString()}
- Fingerprint: ${fingerprint}

## Stack Trace
\`\`\`
${sanitizedStack}

${normalizedContext.store} API Response:
${sanitizedApiResponse}
\`\`\`

## Breadcrumbs
${breadcrumbs.map((bc, index) => `${index + 1}. ${bc}`).join('\n')}

## Publishing Context
- Store: ${normalizedContext.store}
- Phase: ${normalizedContext.phase}
- Item ID: ${normalizedContext.itemId}
- CI Environment: ${normalizedContext.ciEnvironment}
- Run URL: ${this.getRunUrl()}
- Commit: ${this.getCommitSha()}
`;

    const [owner, repoName] = (this.repo || '').split('/');

    const issue = await this.octokit.issues.create({
      owner,
      repo: repoName,
      title,
      body,
      labels: [
        'robot',
        normalizeExtensionLabel(normalizedContext.extension),
        'gatekeeper',
        `store:${normalizedContext.store}`,
        `phase:${normalizedContext.phase}`
      ]
    });

    return issue.data.html_url;
  }

  classifyError(error, phase = 'unknown') {
    if (phase === 'validation') {
      return 'ValidationError';
    }

    const status = error?.response?.status;
    const code = error?.code;

    if (code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'ENOTFOUND') {
      return 'NetworkError';
    }

    if (status === 401 || status === 403) {
      return 'AuthenticationError';
    }

    if (status === 429) {
      return 'QuotaExceededError';
    }

    if (typeof code === 'string' && code.startsWith('PACKAGING_')) {
      return 'PackagingError';
    }

    if (typeof status === 'number' && status >= 400) {
      return 'APIError';
    }

    return 'Error';
  }

  generateFingerprint(error, context) {
    const input = `${ensureMessage(error)}|${context.store}|${context.phase}`;
    return crypto.createHash('sha256').update(input).digest('hex').substring(0, 12);
  }

  buildBreadcrumbs(context) {
    const breadcrumbs = ['Started Gatekeeper publish workflow'];
    breadcrumbs.push(`Loaded extension manifest (${context.extension} v${context.version})`);

    if (context.manifestValidated) {
      breadcrumbs.push(`Validated manifest for ${context.store}`);
    }

    if (context.packaged) {
      breadcrumbs.push(`Packaged extension to ${context.packagePath || 'unknown path'}`);
    }

    if (context.uploaded) {
      breadcrumbs.push(`Uploaded to ${context.store} API`);
    }

    if (context.submitted) {
      breadcrumbs.push(`Submitted for review on ${context.store}`);
    }

    breadcrumbs.push(`Publishing failed at ${context.phase} phase`);

    return breadcrumbs;
  }

  normalizeContext(context) {
    return {
      extension: context.extension || 'Unknown Extension',
      version: context.version || '0.0.0',
      store: context.store || 'unknown',
      phase: context.phase || 'unknown',
      itemId: context.itemId || 'N/A',
      manifestValidated: Boolean(context.manifestValidated),
      packaged: Boolean(context.packaged),
      packagePath: context.packagePath,
      uploaded: Boolean(context.uploaded),
      submitted: Boolean(context.submitted),
      ciEnvironment: process.env.CI ? 'GitHub Actions' : 'Local'
    };
  }

  getRunUrl() {
    if (!process.env.GITHUB_ACTIONS) {
      return 'N/A';
    }

    const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID } = process.env;

    if (!GITHUB_SERVER_URL || !GITHUB_REPOSITORY || !GITHUB_RUN_ID) {
      return 'N/A';
    }

    return `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`;
  }

  getCommitSha() {
    return process.env.GITHUB_SHA ? process.env.GITHUB_SHA.substring(0, 7) : 'unknown';
  }
}
