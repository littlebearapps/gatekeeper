# Prompt 04: Shared Utilities (HTTP, Retry, Sanitize)

**Estimated Time**: 60-90 minutes
**Files**: 3-4 new files
**Phase**: 1 (Core npm Package)
**Dependencies**: Prompts 01-03

---

## Non-Negotiable Policies

1. **Feature Branch**: `feature/shared-utilities`
2. **No Git Operations**: User handles
3. **Plain-English Summary**: Required
4. **Max Files**: 4

---

## Objective

Create shared utility modules for HTTP requests with retry logic, PII sanitization, and authentication helpers used by all publishers.

---

## Repo State

**Existing**: Publishers (base, chrome, firefox), errors, config
**New**:
- `src/utils/retry.js` - Retry logic with exponential backoff
- `src/utils/sanitize.js` - PII sanitization
- `src/utils/auth.js` - Authentication helpers
- `test/unit/utils/retry.test.js`

---

## Implementation Requirements

### Retry Utility (`src/utils/retry.js`)

```javascript
export class RetryHandler {
  constructor(config = {}) {
    this.maxAttempts = config.maxAttempts || 3;
    this.initialDelay = config.initialDelay || 1000;
    this.maxDelay = config.maxDelay || 30000;
    this.backoffMultiplier = config.backoffMultiplier || 2;
  }

  async execute(fn, options = {}) {
    // Execute fn with retry logic
    // Exponential backoff: delay = min(initialDelay * (multiplier ^ attempt), maxDelay)
    // Retry on: NetworkError, QuotaExceededError (429), 5xx errors
    // Do NOT retry: ValidationError, AuthenticationError, 4xx (except 429)
    // Return result or throw error after max attempts
  }

  shouldRetry(error) {
    // Determine if error is retryable
  }

  calculateDelay(attempt) {
    // Exponential backoff calculation
  }
}
```

### Sanitize Utility (`src/utils/sanitize.js`)

```javascript
export class Sanitizer {
  static sanitize(text) {
    // Remove PII patterns:
    // - API tokens: 40+ char alphanumeric → [REDACTED_TOKEN]
    // - GitHub tokens: ghp_... → [REDACTED_GITHUB_TOKEN]
    // - OpenAI keys: sk-... → [REDACTED_API_KEY]
    // - Email addresses → [REDACTED_EMAIL]
    // - CWS credentials: CWS_... → [REDACTED_CWS_CREDENTIAL]
    // - AMO credentials: AMO_... → [REDACTED_AMO_CREDENTIAL]
    // Return sanitized text
  }

  static sanitizeObject(obj) {
    // Recursively sanitize object properties
    // Return sanitized copy
  }
}
```

### Auth Utility (`src/utils/auth.js`)

```javascript
export class AuthHelper {
  static async getGoogleAccessToken(wifConfig) {
    // Get Google access token from WIF config
    // Used by ChromePublisher
  }

  static validateToken(token) {
    // Validate token format
    // Check expiration if JWT
  }
}
```

---

## Acceptance Criteria

**Retry**:
1. ✅ Executes function with exponential backoff
2. ✅ Retries on NetworkError, QuotaExceededError, 5xx
3. ✅ Does NOT retry on ValidationError, AuthenticationError, 4xx (except 429)
4. ✅ Respects maxAttempts limit
5. ✅ Calculates correct backoff delays

**Sanitize**:
6. ✅ Removes all PII patterns (tokens, emails, credentials)
7. ✅ Handles nested objects recursively
8. ✅ Returns sanitized copy (does not mutate)

**Auth**:
9. ✅ Validates token formats
10. ✅ Helpers for Google WIF tokens

---

## Test Plan

**Unit Tests**: Test all utilities with various inputs
**Edge Cases**: Empty strings, null values, deeply nested objects

---

## Output Format

Full file content for all new files.

---

## Checklist

- [ ] Feature branch `feature/shared-utilities`
- [ ] No git ops
- [ ] Max 4 files
- [ ] Comprehensive tests
- [ ] Summary at end
