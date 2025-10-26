# Security Policy

## Supported Versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of Gatekeeper seriously. If you discover a security vulnerability, please follow these steps:

### 1. **Do Not** Open a Public Issue

Please **do not** create a public GitHub issue for security vulnerabilities, as this could put users at risk.

### 2. Report Privately

Send details of the vulnerability to:
- **Email**: [Create a security advisory on GitHub](https://github.com/littlebearapps/gatekeeper/security/advisories/new)
- **GitHub Security Advisories**: Use the "Report a vulnerability" button in the Security tab

### 3. Include in Your Report

Please include as much information as possible:

- **Description**: Clear description of the vulnerability
- **Impact**: What can an attacker do? Who is affected?
- **Steps to Reproduce**: Detailed steps to reproduce the vulnerability
- **Affected Versions**: Which versions are affected?
- **Proof of Concept**: Code or screenshots demonstrating the issue
- **Suggested Fix**: If you have ideas for how to fix it

### Example Report

```
**Summary**: Potential credential exposure in log output

**Description**: When publishing fails, credentials may be logged in
plaintext to console output.

**Impact**: Users' API keys could be exposed in CI/CD logs.

**Steps to Reproduce**:
1. Configure invalid credentials
2. Run: gatekeeper publish --store chrome
3. Check console output for exposed credentials

**Affected Versions**: 0.1.0

**Suggested Fix**: Enhance PII sanitization in src/utils/sanitize.js
```

## What to Expect

- **Acknowledgment**: We'll acknowledge your report within 48 hours
- **Updates**: We'll keep you informed of our progress
- **Disclosure**: We'll coordinate public disclosure with you
- **Credit**: We'll credit you in the security advisory (if you wish)

## Security Considerations

### Credentials

Gatekeeper handles sensitive credentials for browser store APIs:

- **Chrome Web Store**: Workload Identity Federation (WIF) configuration
- **Firefox AMO**: API keys and secrets
- **Microsoft Edge**: Azure AD client credentials

**Security Measures**:
- ✅ All credentials passed via environment variables (never hardcoded)
- ✅ PII sanitization in all log output
- ✅ No credentials stored in codebase
- ✅ Credentials never committed to git (enforced by .gitignore)

### PII Sanitization

Gatekeeper automatically sanitizes Personal Identifiable Information (PII) from logs:

- API keys and secrets
- Authentication tokens
- Publisher IDs
- Email addresses
- IP addresses

See `src/utils/sanitize.js` for implementation details.

### Dependency Security

We regularly audit dependencies for known vulnerabilities:

```bash
# Check for vulnerabilities
npm audit

# Auto-fix vulnerabilities
npm audit fix
```

**Automated Checks**:
- GitHub Dependabot alerts enabled
- Regular dependency updates
- Security patches prioritized

### GitHub Actions

When using Gatekeeper in GitHub Actions:

- ✅ Use GitHub Secrets for credentials (never hardcode in workflows)
- ✅ Use `production` environment with approval gates for sensitive deployments
- ✅ Limit workflow permissions to minimum required
- ✅ Review workflow logs before publishing (credentials should be redacted)

**Example Secure Workflow**:

```yaml
name: Publish Extension

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    environment: production  # Requires approval

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Publish
        env:
          # Credentials from GitHub Secrets
          CWS_PUBLISHER_ID: ${{ secrets.CWS_PUBLISHER_ID }}
          CWS_ITEM_ID: ${{ secrets.CWS_ITEM_ID }}
          CWS_WIF_CONFIG: ${{ secrets.CWS_WIF_CONFIG }}
        run: npx gatekeeper publish --stores chrome
```

## Best Practices for Users

### 1. Keep Dependencies Updated

```bash
npm update
npm audit fix
```

### 2. Use Environment Variables

Never hardcode credentials:

```bash
# ✅ Good
export CWS_PUBLISHER_ID="your-id-here"
npx gatekeeper publish --stores chrome

# ❌ Bad
npx gatekeeper publish --publisher-id "your-id-here"
```

### 3. Review Logs Before Sharing

Even with PII sanitization, review logs before posting publicly:
- Check for any leaked credentials
- Redact sensitive project details
- Remove internal URLs or paths

### 4. Use Approval Gates

For production deployments, use GitHub Environments with required reviewers:

```yaml
environment:
  name: production
  url: https://chrome.google.com/webstore/detail/your-extension
```

### 5. Rotate Credentials Regularly

- Rotate API keys every 90 days
- Use time-limited tokens where possible
- Revoke unused credentials immediately

## Known Security Considerations

### v0.1.0

**PII Sanitization**:
- PII sanitization covers common patterns but may not catch all cases
- Review logs before sharing publicly
- Custom credential formats may not be automatically redacted

**Dependency Vulnerabilities**:
- Some dev dependencies have known vulnerabilities (see `npm audit`)
- These affect development only, not production usage
- Patches will be applied in future releases

## Security Updates

We'll announce security updates via:

- GitHub Security Advisories
- GitHub Releases (tagged with `security`)
- npm package updates

Subscribe to releases to stay informed:
- Watch this repository → Custom → Releases

## Questions?

For general security questions (not vulnerabilities):
- Open a [GitHub Discussion](https://github.com/littlebearapps/gatekeeper/discussions)
- Tag with `security` label

For vulnerabilities, please use private reporting methods above.

---

Thank you for helping keep Gatekeeper and its users safe! 🔒
