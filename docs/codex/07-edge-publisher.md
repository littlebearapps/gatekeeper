# Prompt 07: Microsoft Edge Publisher

**Estimated Time**: 90-120 minutes
**Files**: 2-3 new files
**Phase**: 5 (Edge Publisher)
**Dependencies**: Prompts 01-06

---

## Non-Negotiable Policies

1. **Feature Branch**: `feature/edge-publisher`
2. **No Git Operations**: User handles
3. **Plain-English Summary**: Required
4. **Max Files**: 3

---

## Objective

Implement EdgePublisher for Microsoft Edge Add-ons using Edge Add-ons API with Azure AD authentication.

---

## Repo State

**Existing**: Chrome and Firefox publishers, utilities, Homeostat integration
**New**:
- `src/publishers/edge.js`
- `test/unit/publishers/edge.test.js`
- `test/fixtures/edge-manifest.json`

---

## Edge Add-ons API Details

**Base URL**: `https://api.addons.microsoftedge.microsoft.com/v1/products`

**Authentication**: Azure AD OAuth2
- Client ID + Client Secret
- Token endpoint: `https://login.microsoftonline.com/[tenant]/oauth2/v2.0/token`
- Scope: `https://api.addons.microsoftedge.microsoft.com/.default`

**Endpoints**:
1. **Upload**: `POST /products/{productId}/submissions/draft/package`
2. **Publish**: `POST /products/{productId}/submissions`
3. **Get Submission**: `GET /products/{productId}/submissions/{submissionId}`

**Request Headers**:
```
Authorization: Bearer {access_token}
Content-Type: application/zip
```

---

## Implementation

```javascript
import { BasePublisher } from './base.js';
import axios from 'axios';

export class EdgePublisher extends BasePublisher {
  constructor(config) {
    super(config);
    this.credentials = config.credentials.edge;
    this.tokenUrl = 'https://login.microsoftonline.com/...'; // Add tenant
    this.apiBase = 'https://api.addons.microsoftedge.microsoft.com/v1';
  }

  async getAccessToken() {
    // OAuth2 client credentials flow
    // POST to token endpoint
    // Return access token
  }

  async validate(manifest) {
    // Validate Edge-specific requirements
    // Check manifest_version (2 or 3)
    // Check required fields
  }

  async package(manifest, outputPath) {
    // Create .zip (same as Chrome)
    // Edge uses .zip format
  }

  async upload(artifact, credentials) {
    // Upload .zip to Edge API
    // POST /products/{productId}/submissions/draft/package
    // Return submission ID
  }

  async publish(uploadId, credentials, options = {}) {
    // Publish submission
    // POST /products/{productId}/submissions
    // Options: notes (release notes)
    // Return publish result
  }

  async cancel(uploadId, credentials) {
    // Delete draft submission
    // DELETE /products/{productId}/submissions/draft
  }
}
```

---

## Acceptance Criteria

**Functional**:
1. ✅ EdgePublisher extends BasePublisher
2. ✅ Authenticates with Azure AD OAuth2
3. ✅ validate() checks Edge requirements
4. ✅ package() creates .zip
5. ✅ upload() sends correct API request
6. ✅ publish() submits for review
7. ✅ cancel() deletes draft

**Error Handling**:
8. ✅ OAuth errors → AuthenticationError
9. ✅ API errors properly classified
10. ✅ Rate limits → QuotaExceededError

---

## Test Plan

**Unit Tests**: Mock Edge API, OAuth2 flow
**Fixture**: Edge-compatible manifest (Manifest V2/V3)

---

## Output Format

Full file content for all new files.

---

## Checklist

- [ ] Feature branch `feature/edge-publisher`
- [ ] No git ops
- [ ] Max 3 files
- [ ] Mock Edge API
- [ ] Summary at end
