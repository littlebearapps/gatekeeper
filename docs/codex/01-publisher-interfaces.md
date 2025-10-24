# Prompt 01: Publisher Interfaces + Error Taxonomy + Config Schema

**Estimated Time**: 45-60 minutes
**Files**: 3-4 new files
**Phase**: 1 (Core npm Package)

---

## Non-Negotiable Policies

**⚠️ CRITICAL - Confirm these before coding:**

1. **Feature Branch Only**: Create and use `feature/publisher-interfaces`. NEVER use main.
2. **No Git Operations**: Skip all git commands. User will handle commits/PRs.
3. **Plain-English Summary**: End with summary of all tasks completed.
4. **Output Format**:
   - New files: Print full file content
   - Modified files: Not applicable (all new files)
5. **Max Files**: Do not exceed 4 new files in this prompt.

---

## Objective

Create the foundational publisher interface, error taxonomy, and configuration schema that all browser-specific publishers will implement. This establishes the contract for Chrome, Firefox, and Edge publishers.

---

## Repo State

**Current State**: Empty npm package (package.json exists, src/ does not exist yet)

**Files to Create**:
- `src/publishers/base.js` (new)
- `src/core/errors.js` (new)
- `src/core/config.js` (new)
- `test/unit/publishers/base.test.js` (new) - optional if within file limit

---

## Shared Context

**Reference**: See `docs/codex/00-CONTEXT.md` for:
- Technology stack (Node.js, ES modules)
- Retry/timeout policy
- Environment variables
- Directory structure

**Do NOT repeat context here** - assume it's available from context file.

---

## Interfaces and Contracts

### BasePublisher Abstract Class

**Required Methods** (all publishers must implement):

```javascript
export class BasePublisher {
  constructor(config) {
    // Validate config
    // Initialize HomeostatReporter (defer actual integration to Prompt 06)
    // For now, just store config
  }

  // Abstract methods - throw 'Not implemented' error
  async validate(manifest) { }
  async package(manifest, outputPath) { }
  async upload(artifact, credentials) { }
  async publish(uploadId, credentials, options) { }
  async cancel(uploadId, credentials) { }

  // Common utilities
  async sanitizeLogs(logs) {
    // Remove PII patterns:
    // - API tokens (40+ chars alphanumeric)
    // - GitHub tokens (ghp_...)
    // - Email addresses
    // - Chrome Web Store credentials (CWS_...)
    // - Firefox AMO credentials (AMO_...)
  }

  async reportError(error, context) {
    // Placeholder for Homeostat integration (Prompt 06)
    // For now, just log error and context
    console.error('Publishing error:', error.message, context);
  }
}
```

### Error Taxonomy

**File**: `src/core/errors.js`

Create custom error classes for each publishing error type:

```javascript
export class PublishingError extends Error {
  constructor(message, context = {}) {
    super(message);
    this.name = this.constructor.name;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }
}

export class ValidationError extends PublishingError { }
export class APIError extends PublishingError { }
export class NetworkError extends PublishingError { }
export class AuthenticationError extends PublishingError { }
export class QuotaExceededError extends PublishingError { }
export class PackagingError extends PublishingError { }

// Error type constants for classification
export const ERROR_TYPES = {
  VALIDATION: 'ValidationError',
  API: 'APIError',
  NETWORK: 'NetworkError',
  AUTHENTICATION: 'AuthenticationError',
  QUOTA: 'QuotaExceededError',
  PACKAGING: 'PackagingError'
};
```

### Configuration Schema

**File**: `src/core/config.js`

Create configuration validator and schema:

```javascript
export class ConfigValidator {
  static validate(config) {
    // Required fields
    const required = ['githubToken', 'repo', 'browsers'];

    // Validate required fields exist
    // Validate githubToken format (ghp_...)
    // Validate repo format (owner/repo)
    // Validate browsers array (non-empty, valid values)

    // Validate credentials based on browsers
    // - chrome: requires publisherId, itemId, wifConfig
    // - firefox: requires apiKey, apiSecret
    // - edge: requires clientId, clientSecret, productId

    // Throw ValidationError if invalid
    // Return validated config if valid
  }

  static getDefault() {
    // Return default config structure
  }
}

export const CONFIG_SCHEMA = {
  githubToken: { type: 'string', required: true, pattern: /^ghp_/ },
  repo: { type: 'string', required: true, pattern: /^[\w-]+\/[\w-]+$/ },
  browsers: { type: 'array', required: true, items: ['chrome', 'firefox', 'edge'] },
  credentials: {
    chrome: {
      publisherId: { type: 'string', required: true },
      itemId: { type: 'string', required: true },
      wifConfig: { type: 'object', required: true }
    },
    firefox: {
      apiKey: { type: 'string', required: true },
      apiSecret: { type: 'string', required: true }
    },
    edge: {
      clientId: { type: 'string', required: true },
      clientSecret: { type: 'string', required: true },
      productId: { type: 'string', required: true }
    }
  }
};
```

---

## Scope and Constraints

**Node Version**: 18+ (ES modules)
**Testing Framework**: Vitest (unit tests)
**Browsers**: Chrome, Firefox, Edge
**Non-Goals**:
- Homeostat integration (Prompt 06)
- Actual publisher implementations (Prompts 02-03, 07)
- HTTP/retry utilities (Prompt 04)

---

## Acceptance Criteria

**Functional**:
1. ✅ BasePublisher class exists with all abstract methods
2. ✅ Abstract methods throw 'Not implemented' error when called
3. ✅ sanitizeLogs() removes PII patterns (tokens, emails, credentials)
4. ✅ reportError() logs error (placeholder for future Homeostat integration)
5. ✅ All error classes extend PublishingError with proper name and context
6. ✅ ERROR_TYPES constant exports all error type strings
7. ✅ ConfigValidator validates all required fields
8. ✅ ConfigValidator throws ValidationError for invalid configs
9. ✅ ConfigValidator validates credential requirements per browser

**Error Cases**:
10. ✅ Invalid githubToken format throws ValidationError
11. ✅ Invalid repo format throws ValidationError
12. ✅ Empty browsers array throws ValidationError
13. ✅ Missing chrome credentials (when 'chrome' in browsers) throws ValidationError
14. ✅ Missing firefox credentials (when 'firefox' in browsers) throws ValidationError
15. ✅ Missing edge credentials (when 'edge' in browsers) throws ValidationError

---

## Test Plan

**Unit Tests** (optional if within 4-file limit):
- Create `test/unit/publishers/base.test.js`
- Test BasePublisher throws on abstract methods
- Test sanitizeLogs removes PII patterns
- Create `test/unit/core/errors.test.js`
- Test all error classes construct properly
- Create `test/unit/core/config.test.js`
- Test ConfigValidator with valid and invalid configs

**Smoke Test**:
```javascript
import { BasePublisher } from './src/publishers/base.js';
import { ValidationError } from './src/core/errors.js';
import { ConfigValidator } from './src/core/config.js';

// Test error creation
const err = new ValidationError('Test error', { field: 'test' });
console.log(err.name); // 'ValidationError'
console.log(err.context); // { field: 'test' }

// Test config validation
try {
  ConfigValidator.validate({ githubToken: 'invalid' });
} catch (e) {
  console.log(e.name); // 'ValidationError'
}

// Test base publisher
class TestPublisher extends BasePublisher {}
const pub = new TestPublisher({});
try {
  await pub.validate({});
} catch (e) {
  console.log(e.message); // 'Not implemented'
}
```

---

## Output Format

**For each new file**:
```
=== src/publishers/base.js ===
[full file content here]

=== src/core/errors.js ===
[full file content here]

=== src/core/config.js ===
[full file content here]

=== test/unit/publishers/base.test.js === (if included)
[full file content here]
```

**No git commands**.

---

## Checklist: Confirm Before Coding

Before implementing, confirm:
- [ ] Feature branch: `feature/publisher-interfaces` (NO main)
- [ ] No git operations (user handles)
- [ ] Max 4 files (3 required + 1 optional test file)
- [ ] All acceptance criteria understood (15 items)
- [ ] Output format: full file content for all new files
- [ ] Plain-English summary at end

Once confirmed, proceed with implementation.

---

## End Summary Format

After implementation, provide:
```
**Files Created**: [list file paths]
**Key Decisions**: [2-3 bullets on important design choices]
**How to Test**: [command to run tests or smoke script]
**Next Steps**: [what Prompt 02 will build on]
```
