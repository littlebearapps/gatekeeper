# Prompt 02: Chrome Web Store Publisher

**Estimated Time**: 90-120 minutes
**Files**: 2-3 new files
**Phase**: 1 (Core npm Package)
**Dependencies**: Prompt 01 (BasePublisher)

---

## Non-Negotiable Policies

1. **Feature Branch Only**: Create `feature/chrome-publisher`. NEVER use main.
2. **No Git Operations**: User handles commits/PRs.
3. **Plain-English Summary**: Required at end.
4. **Output Format**: Full content for new files, minimal diffs for modified.
5. **Max Files**: 3 files maximum.

---

## Objective

Implement ChromePublisher class that integrates with Chrome Web Store API v2, supporting upload, publish, staged publish, percentage rollout, and cancel operations. Use Workload Identity Federation (WIF) for authentication.

---

## Repo State

**Existing Files** (from Prompt 01):
- `src/publishers/base.js` - BasePublisher class
- `src/core/errors.js` - Error taxonomy
- `src/core/config.js` - Config validation

**Files to Create**:
- `src/publishers/chrome.js` (new)
- `test/unit/publishers/chrome.test.js` (new)
- `test/fixtures/chrome-manifest.json` (new) - sample manifest for testing

---

## Shared Context

**Reference**: `docs/codex/00-CONTEXT.md` for:
- BasePublisher interface
- Error types
- Retry policy
- Environment variables

---

## Chrome Web Store API v2 Details

**Base URL**: `https://www.googleapis.com/chromewebstore/v1.1/items`

**Authentication**: Workload Identity Federation (WIF)
- Use `google-auth-library` npm package
- Load WIF config from credentials.chrome.wifConfig
- Obtain access token via `auth.getAccessToken()`

**Endpoints**:
1. **Upload**: `PUT /items/{itemId}`
2. **Publish**: `POST /items/{itemId}/publish`
3. **Cancel Publish**: `POST /items/{itemId}/edits/{editId}:cancelPublish`
4. **Get Item**: `GET /items/{itemId}`

**Request Headers**:
```
Authorization: Bearer {access_token}
x-goog-api-version: 2
```

---

## Implementation Requirements

### ChromePublisher Class

```javascript
import { BasePublisher } from './base.js';
import { ValidationError, APIError, AuthenticationError, QuotaExceededError } from '../core/errors.js';
import { GoogleAuth } from 'google-auth-library';

export class ChromePublisher extends BasePublisher {
  constructor(config) {
    super(config);
    this.credentials = config.credentials.chrome;
    this.auth = new GoogleAuth({
      credentials: this.credentials.wifConfig,
      scopes: ['https://www.googleapis.com/auth/chromewebstore']
    });
  }

  async validate(manifest) {
    // Validate manifest using web-ext lint (basic validation)
    // Check required fields: name, version, manifest_version, icons
    // Check Chrome-specific requirements
    // Throw ValidationError if invalid
  }

  async package(manifest, outputPath) {
    // Create .zip file from manifest directory
    // Include all files referenced in manifest
    // Exclude: node_modules, .git, tests, docs
    // Return path to .zip file
  }

  async upload(artifact, credentials) {
    // Get access token from WIF
    // Upload .zip to CWS API
    // PUT /items/{itemId}
    // Handle errors: 401/403 → AuthenticationError, 429 → QuotaExceededError
    // Return upload ID
  }

  async publish(uploadId, credentials, options = {}) {
    // Publish uploaded extension
    // POST /items/{itemId}/publish
    // Support options:
    //   - target: 'default' | 'trustedTesters'
    //   - percentageRollout: number (0-100, requires 10k+ users)
    // Handle errors
    // Return publish result { success: boolean, url: string }
  }

  async cancel(uploadId, credentials) {
    // Cancel pending publish
    // POST /items/{itemId}/edits/{editId}:cancelPublish
    // Return cancellation result
  }
}
```

**Key Features**:
- WIF authentication (no long-lived secrets)
- Support for staged publish (trustedTesters)
- Support for percentage rollout (10k+ users only)
- Proper error classification (ValidationError, APIError, AuthenticationError, QuotaExceededError)

---

## Scope and Constraints

**Dependencies**: `google-auth-library`, `archiver` (for .zip), `web-ext` (for validation)
**Testing**: Use mocks for Chrome Web Store API (no real API calls)
**Node Version**: 18+ (ES modules)
**Non-Goals**:
- Retry logic (Prompt 04)
- Real Homeostat integration (Prompt 06)
- CLI interface (Prompt 05)

---

## Acceptance Criteria

**Functional**:
1. ✅ ChromePublisher extends BasePublisher
2. ✅ validate() checks required manifest fields
3. ✅ validate() throws ValidationError for invalid manifests
4. ✅ package() creates valid .zip file
5. ✅ package() excludes node_modules, .git, tests
6. ✅ upload() authenticates with WIF
7. ✅ upload() sends correct PUT request to CWS API
8. ✅ publish() supports default and trustedTesters targets
9. ✅ publish() supports percentageRollout option
10. ✅ cancel() sends correct POST request

**Error Handling**:
11. ✅ 401/403 responses throw AuthenticationError
12. ✅ 429 responses throw QuotaExceededError
13. ✅ 4xx/5xx responses throw APIError
14. ✅ Network failures throw NetworkError
15. ✅ Invalid manifest throws ValidationError

---

## Test Plan

**Unit Tests** (`test/unit/publishers/chrome.test.js`):
- Mock `google-auth-library` to return fake access token
- Mock Chrome Web Store API responses
- Test each method (validate, package, upload, publish, cancel)
- Test error scenarios (401, 429, 5xx)
- Verify correct API endpoints and payloads

**Test Fixture** (`test/fixtures/chrome-manifest.json`):
```json
{
  "manifest_version": 3,
  "name": "Test Extension",
  "version": "1.0.0",
  "icons": {
    "16": "icon16.png",
    "48": "icon48.png",
    "128": "icon128.png"
  }
}
```

**Smoke Test**:
```javascript
import { ChromePublisher } from './src/publishers/chrome.js';

const config = {
  githubToken: 'ghp_test',
  repo: 'owner/repo',
  credentials: {
    chrome: {
      publisherId: 'test-publisher',
      itemId: 'test-item-id',
      wifConfig: { /* mock config */ }
    }
  }
};

const publisher = new ChromePublisher(config);
await publisher.validate({ /* manifest */ });
console.log('✅ Chrome publisher created');
```

---

## Output Format

```
=== src/publishers/chrome.js ===
[full file content]

=== test/unit/publishers/chrome.test.js ===
[full file content]

=== test/fixtures/chrome-manifest.json ===
[full file content]
```

---

## Checklist: Confirm Before Coding

- [ ] Feature branch: `feature/chrome-publisher`
- [ ] No git operations
- [ ] Max 3 files
- [ ] All 15 acceptance criteria understood
- [ ] Mocks for Chrome Web Store API (no real calls)
- [ ] Plain-English summary at end

---

## End Summary Format

```
**Files Created**: [paths]
**Key Decisions**: [WIF auth approach, error classification]
**How to Test**: npm test -- chrome
**Next Steps**: Prompt 03 will implement Firefox publisher
```
