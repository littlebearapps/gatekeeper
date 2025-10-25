# Gatekeeper - Shared Context for Codex Prompts

**Last Updated**: 2025-10-24

---

## Project Overview

**Gatekeeper** - Centralized browser extension publishing system for Little Bear Apps.

**Purpose**: Automates deployment to multiple browser stores (Chrome, Firefox, Edge) while integrating with Homeostat for automated error fixes.

**Architecture**: Hybrid dual-repository pattern
- **npm Package**: `@littlebearapps/gatekeeper` (shared publishing logic)
- **Coordination Repo**: This repository (orchestration, monitoring, workflows)
- **Per-Extension**: Minimal integration (~30-40 lines per extension)

**Target Extensions**: Convert My File, NoteBridge, PaletteKit

---

## Technology Stack

- **Language**: Node.js / JavaScript (ES modules)
- **Package Manager**: npm
- **Testing**: Vitest (unit + integration tests)
- **CI/CD**: GitHub Actions
- **Dependencies**:
  - `@octokit/rest` - GitHub Issues API
  - `chrome-webstore-upload` - Chrome Web Store API v2
  - `web-ext` - Firefox AMO validation and signing
  - `archiver` - .zip packaging

---

## Key Interfaces (Stable Contracts)

### BasePublisher Interface

```javascript
export class BasePublisher {
  constructor(config) {
    this.reporter = new HomeostatReporter({
      githubToken: config.githubToken,
      repo: config.repo
    });
  }

  // Abstract methods all publishers must implement
  async validate(manifest) { throw new Error('Not implemented'); }
  async package(manifest, outputPath) { throw new Error('Not implemented'); }
  async upload(artifact, credentials) { throw new Error('Not implemented'); }
  async publish(uploadId, credentials, options) { throw new Error('Not implemented'); }
  async cancel(uploadId, credentials) { throw new Error('Not implemented'); }

  // Common utilities
  async sanitizeLogs(logs) { /* PII sanitization */ }
  async reportError(error, context) { /* Report to Homeostat */ }
}
```

### Error Taxonomy

```javascript
// Error types for Homeostat classification
const ERROR_TYPES = {
  VALIDATION: 'ValidationError',
  API: 'APIError',
  NETWORK: 'NetworkError',
  AUTHENTICATION: 'AuthenticationError',
  QUOTA: 'QuotaExceededError',
  PACKAGING: 'PackagingError'
};
```

### Configuration Schema

```javascript
{
  githubToken: string,      // Required: GitHub PAT with 'repo' scope
  repo: string,             // Required: "owner/repo" format
  browsers: string[],       // Required: ['chrome', 'firefox', 'edge']
  credentials: {
    chrome: {
      publisherId: string,
      itemId: string,
      wifConfig: object     // Workload Identity Federation
    },
    firefox: {
      apiKey: string,
      apiSecret: string
    },
    edge: {
      clientId: string,
      clientSecret: string,
      productId: string
    }
  }
}
```

---

## Environment Variables

```bash
# GitHub Integration
GITHUB_TOKEN=ghp_...              # PAT with 'repo' scope

# Chrome Web Store
CWS_PUBLISHER_ID=...              # Publisher ID
CWS_ITEM_ID=...                   # Extension ID
CWS_WIF_CONFIG=...                # WIF JSON config

# Firefox AMO
AMO_API_KEY=...                   # AMO API key
AMO_API_SECRET=...                # AMO API secret

# Microsoft Edge
EDGE_CLIENT_ID=...                # Azure AD client ID
EDGE_CLIENT_SECRET=...            # Azure AD client secret
EDGE_PRODUCT_ID=...               # Product ID
```

---

## Retry/Timeout Policy

```javascript
const RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelay: 1000,        // 1 second
  maxDelay: 30000,           // 30 seconds
  backoffMultiplier: 2,      // Exponential backoff
  timeout: 120000            // 2 minutes per request
};
```

---

## Non-Negotiable Policies

**⚠️ CRITICAL - Must follow in all prompts:**

1. **Feature Branch Only**: Always create and use a feature branch. NEVER use main.
2. **No Git Operations**: Skip all git operations (user will handle commits/PRs).
3. **Plain-English Summary**: End every response with a summary of all tasks completed.
4. **Output Format**:
   - New files: Print full file content
   - Modified files: Print minimal unified diff with 3 lines of context
5. **Max Files Per Prompt**: Do not exceed 5 new/modified files per prompt.

---

## Directory Structure

```
@littlebearapps/gatekeeper/
├── src/
│   ├── publishers/
│   │   ├── base.js              # BasePublisher abstract class
│   │   ├── chrome.js            # Chrome Web Store publisher
│   │   ├── firefox.js           # Firefox AMO publisher
│   │   └── edge.js              # Microsoft Edge publisher
│   ├── core/
│   │   ├── validator.js         # Manifest validation
│   │   ├── packager.js          # .zip packaging
│   │   ├── homeostat-reporter.js # Error reporting
│   │   └── config.js            # Configuration management
│   └── utils/
│       ├── auth.js              # Store authentication
│       ├── retry.js             # Retry logic with backoff
│       └── sanitize.js          # PII sanitization
├── test/
│   ├── unit/
│   └── integration/
├── docs/
└── package.json
```

---

## Rolling Changelog

**Phase 1, 2, 5 Complete** (2025-10-25):
- ✅ All 8 Codex prompts implemented (01-08)
- ✅ Publishers: Chrome, Firefox, Edge (3/4 browsers)
- ✅ Utilities: retry, sanitize, auth
- ✅ CLI: `gatekeeper publish`, `gatekeeper validate`, `gatekeeper cancel`
- ✅ Homeostat integration (GitHub Issues API via Octokit)
- ✅ Monitoring: structured logging, metrics, health checks
- ✅ Tests: 79/79 passing, smoke tests passing
- ✅ GitHub Actions: reusable workflows created
- ✅ Documentation: updated to reflect completion status
- 🔜 Next: Publish npm package, integrate into extensions (Phase 3)

**Initial State** (2025-10-24):
- Repository structure created
- Implementation plan complete (4,100+ lines, GPT-5 validated)
- Homeostat integration architecture defined
- Ready for Phase 1 implementation

---

## References

- **Full Implementation Plan**: `docs/GATEKEEPER-IMPLEMENTATION-PLAN.md`
- **Homeostat Integration**: See Section 3 of implementation plan
- **Chrome Web Store API v2**: See implementation plan sections
- **Firefox AMO API**: See implementation plan sections
