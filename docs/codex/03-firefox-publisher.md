# Prompt 03: Firefox AMO Publisher

**Estimated Time**: 60-90 minutes
**Files**: 2-3 new files
**Phase**: 1 (Core npm Package)
**Dependencies**: Prompts 01-02

---

## Non-Negotiable Policies

1. **Feature Branch**: `feature/firefox-publisher`
2. **No Git Operations**: User handles
3. **Plain-English Summary**: Required
4. **Max Files**: 3

---

## Objective

Implement FirefoxPublisher using `web-ext` CLI tool for validation, packaging, and signing via Firefox AMO (addons.mozilla.org) API.

---

## Repo State

**Existing**: BasePublisher, ChromePublisher, errors, config
**New**: `src/publishers/firefox.js`, `test/unit/publishers/firefox.test.js`, `test/fixtures/firefox-manifest.json`

---

## Firefox AMO API Details

**Tool**: Use `web-ext` npm package (official Mozilla tool)
**API**: AMO Signing API (https://addons.mozilla.org/api/v5/)

**web-ext Commands**:
```bash
# Validate
web-ext lint --source-dir <dir>

# Sign (upload + publish)
web-ext sign \
  --source-dir <dir> \
  --api-key <key> \
  --api-secret <secret> \
  --channel listed
```

**Authentication**: API key + secret (from credentials.firefox)

---

## Implementation

```javascript
import { BasePublisher } from './base.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class FirefoxPublisher extends BasePublisher {
  async validate(manifest) {
    // Run: web-ext lint --source-dir <manifest-dir>
    // Parse output for errors
    // Throw ValidationError if lint fails
  }

  async package(manifest, outputPath) {
    // Create .xpi (Firefox uses .xpi, same as .zip)
    // Exclude: node_modules, .git, tests
    // Return .xpi path
  }

  async upload(artifact, credentials) {
    // Not applicable - AMO combines upload+publish
    // Return staging ID for tracking
  }

  async publish(uploadId, credentials, options = {}) {
    // Run: web-ext sign with API key/secret
    // Options: channel (listed/unlisted)
    // Parse web-ext output
    // Handle errors: 401 → AuthenticationError, 429 → QuotaExceededError
    // Return { success: true, url: addon-url }
  }

  async cancel(uploadId, credentials) {
    // Not supported by AMO (immediate publish)
    // Throw error explaining limitation
  }
}
```

---

## Acceptance Criteria

**Functional**:
1. ✅ FirefoxPublisher extends BasePublisher
2. ✅ validate() uses web-ext lint
3. ✅ validate() throws ValidationError on lint errors
4. ✅ package() creates .xpi file
5. ✅ publish() uses web-ext sign
6. ✅ publish() supports listed/unlisted channels
7. ✅ cancel() throws error (not supported)

**Error Handling**:
8. ✅ web-ext errors properly classified
9. ✅ API authentication errors → AuthenticationError
10. ✅ Rate limits → QuotaExceededError

---

## Test Plan

**Unit Tests**: Mock `web-ext` CLI via child_process
**Fixture**: `test/fixtures/firefox-manifest.json` (Manifest V2/V3 compatible)

---

## Output Format

Full file content for all 3 files.

---

## Checklist

- [ ] Feature branch `feature/firefox-publisher`
- [ ] No git ops
- [ ] Max 3 files
- [ ] Mock web-ext in tests
- [ ] Summary at end
