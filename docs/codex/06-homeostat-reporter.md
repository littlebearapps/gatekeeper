# Prompt 06: Homeostat Error Reporter

**Estimated Time**: 60-90 minutes
**Files**: 2-3 new files
**Phase**: 2 (Homeostat Integration)
**Dependencies**: Prompts 01-05

---

## Non-Negotiable Policies

1. **Feature Branch**: `feature/homeostat-reporter`
2. **No Git Operations**: User handles
3. **Plain-English Summary**: Required
4. **Max Files**: 3

---

## Objective

Implement HomeostatReporter that creates GitHub issues via Octokit when publishing errors occur, using the exact Homeostat format for automated fixes.

---

## Repo State

**Existing**: All Phase 1 files (publishers, utilities, CLI)
**New**:
- `src/core/homeostat-reporter.js`
- `test/unit/core/homeostat-reporter.test.js`
- Update `src/publishers/base.js` - Integrate HomeostatReporter

---

## Homeostat Issue Format (EXACT)

**Reference**: See `docs/GATEKEEPER-IMPLEMENTATION-PLAN.md` Section 3 for complete specification.

**Title**: `[ExtensionName] ErrorType: Error message (max 100 chars)`

**Body**:
```markdown
## Error Details
- Extension: ExtensionName v1.2.3
- Error Type: ValidationError
- Message: Error message
- Timestamp: 2025-10-24T12:34:56Z
- Fingerprint: abc123def456

## Stack Trace
```
[sanitized stack trace]

[API response if applicable]
```

## Breadcrumbs
1. Started Gatekeeper publish workflow
2. Loaded extension manifest (ExtensionName v1.2.3)
3. Validated manifest for Chrome Web Store
4. Publishing failed at validation phase

## Publishing Context
- Store: Chrome Web Store
- Phase: validation
- Item ID: abc123xyz
- CI Environment: GitHub Actions
- Run URL: https://github.com/owner/repo/actions/runs/123
- Commit: a1b2c3d
```

**Labels**: `robot`, extension-name, `gatekeeper`, `store:chrome`, `phase:validation`

---

## Implementation

```javascript
import { Octokit } from '@octokit/rest';
import crypto from 'crypto';
import { Sanitizer } from '../utils/sanitize.js';

export class HomeostatReporter {
  constructor(config) {
    this.octokit = new Octokit({ auth: config.githubToken });
    this.repo = config.repo; // "owner/repo"
  }

  async reportPublishingError(error, context) {
    const { extension, version, store, phase, itemId } = context;

    const errorType = this.classifyError(error, phase);
    const fingerprint = this.generateFingerprint(error, context);
    const breadcrumbs = this.buildBreadcrumbs(context);

    const sanitizedMessage = Sanitizer.sanitize(error.message);
    const sanitizedStack = Sanitizer.sanitize(error.stack || '');

    // EXACT format for Homeostat
    const title = `[${extension}] ${errorType}: ${sanitizedMessage.substring(0, 100)}`;

    const body = `## Error Details
- Extension: ${extension} v${version}
- Error Type: ${errorType}
- Message: ${sanitizedMessage}
- Timestamp: ${new Date().toISOString()}
- Fingerprint: ${fingerprint}

## Stack Trace
\`\`\`
${sanitizedStack}

${store} API Response:
${Sanitizer.sanitize(JSON.stringify(error.apiResponse || {}, null, 2))}
\`\`\`

## Breadcrumbs
${breadcrumbs.map((bc, i) => `${i + 1}. ${bc}`).join('\n')}

## Publishing Context
- Store: ${store}
- Phase: ${phase}
- Item ID: ${itemId || 'N/A'}
- CI Environment: ${process.env.CI ? 'GitHub Actions' : 'Local'}
- Run URL: ${this.getRunUrl()}
- Commit: ${process.env.GITHUB_SHA?.substring(0, 7) || 'unknown'}
`;

    const [owner, repoName] = this.repo.split('/');

    const issue = await this.octokit.issues.create({
      owner,
      repo: repoName,
      title,
      body,
      labels: [
        'robot',                    // Required by Homeostat
        extension.toLowerCase(),    // Required by Homeostat
        'gatekeeper',
        `store:${store}`,
        `phase:${phase}`
      ]
    });

    return issue.data.html_url;
  }

  classifyError(error, phase) {
    if (phase === 'validation') return 'ValidationError';
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') return 'NetworkError';
    if (error.response?.status === 401 || error.response?.status === 403) return 'AuthenticationError';
    if (error.response?.status === 429) return 'QuotaExceededError';
    if (error.code?.startsWith('PACKAGING_')) return 'PackagingError';
    if (error.response?.status >= 400) return 'APIError';
    return 'Error';
  }

  generateFingerprint(error, context) {
    const input = `${error.message}|${context.store}|${context.phase}`;
    return crypto.createHash('sha256').update(input).digest('hex').substring(0, 12);
  }

  buildBreadcrumbs(context) {
    const bc = ['Started Gatekeeper publish workflow'];
    bc.push(`Loaded extension manifest (${context.extension} v${context.version})`);
    if (context.manifestValidated) bc.push(`Validated manifest for ${context.store}`);
    if (context.packaged) bc.push(`Packaged extension to ${context.packagePath}`);
    if (context.uploaded) bc.push(`Uploaded to ${context.store} API`);
    if (context.submitted) bc.push(`Submitted for review on ${context.store}`);
    bc.push(`Publishing failed at ${context.phase} phase`);
    return bc;
  }

  getRunUrl() {
    if (!process.env.GITHUB_ACTIONS) return 'N/A';
    const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID } = process.env;
    return `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`;
  }
}
```

---

## Update BasePublisher

**Modify `src/publishers/base.js`**:
```javascript
import { HomeostatReporter } from '../core/homeostat-reporter.js';

export class BasePublisher {
  constructor(config) {
    this.reporter = new HomeostatReporter({
      githubToken: config.githubToken,
      repo: config.repo
    });
  }

  async reportError(error, context) {
    // Replace placeholder with actual Homeostat integration
    return await this.reporter.reportPublishingError(error, context);
  }
}
```

---

## Acceptance Criteria

**HomeostatReporter**:
1. ✅ Creates GitHub issues via Octokit
2. ✅ Uses exact Homeostat title format
3. ✅ Uses exact Homeostat body format
4. ✅ Adds all required labels
5. ✅ Classifies errors correctly (6 types)
6. ✅ Generates unique fingerprints
7. ✅ Builds accurate breadcrumbs
8. ✅ Sanitizes all PII (tokens, credentials)
9. ✅ Returns issue URL

**Integration**:
10. ✅ BasePublisher uses HomeostatReporter
11. ✅ All publishers inherit error reporting
12. ✅ Context object properly structured

---

## Test Plan

**Unit Tests**: Mock Octokit, verify issue creation
**Integration Test**: Create real issue in test repo (optional)

---

## Output Format

Full file content for all new/modified files.

---

## Checklist

- [ ] Feature branch `feature/homeostat-reporter`
- [ ] No git ops
- [ ] Max 3 files
- [ ] Mock Octokit in tests
- [ ] Summary at end
