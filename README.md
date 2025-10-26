# Gatekeeper

[![npm version](https://img.shields.io/npm/v/@littlebearapps/gatekeeper)](https://www.npmjs.com/package/@littlebearapps/gatekeeper)
[![Tests](https://github.com/littlebearapps/gatekeeper/actions/workflows/test.yml/badge.svg)](https://github.com/littlebearapps/gatekeeper/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/node/v/@littlebearapps/gatekeeper)](package.json)

**Automate browser extension publishing to Chrome, Firefox, and Edge stores with a single command.**

## Status

✅ **Phase 1 Complete** - Core npm package (Chrome, Firefox)
✅ **Phase 2 Complete** - Error reporting and monitoring
✅ **Phase 5 Complete** - Edge publisher + health checks
🔜 **Phase 3 Next** - Extension integration (3 extensions)
🔜 **Phase 4 Next** - Pilot deployment and testing

**Implementation Status**:
- npm Package: `@littlebearapps/gatekeeper@0.1.0` (ready to publish)
- Tests: 79/79 passing ✅
- Browsers: Chrome ✅ | Firefox ✅ | Edge ✅ | Safari 🔜
- Extensions: 0/3 integrated (Phase 3 pending)

## Purpose

Automates deployment of browser extensions to multiple stores with a single command.

**What Gatekeeper Does**:
- ✅ Validates extension manifests (cross-browser compatibility)
- ✅ Packages extensions (.zip, .xpi, .crx)
- ✅ Publishes to browser stores (Chrome, Firefox, Edge — Safari planned)
- ✅ Integrates with GitHub Actions for CI/CD workflows
- ✅ Provides approval gates via GitHub Environments
- ✅ Optional: Error reporting integration for automated monitoring

**Key Benefits**:
- **65% Code Reduction**: 1,680 lines vs 4,800 for per-extension approach
- **67% Maintenance Savings**: Bug fixes in 1 place vs 3-12
- **Scales Easily**: Adding extension = 10 minutes (vs 2 hours)
- **$0/year Operating Cost**: GitHub Actions included

**Target Extensions**: Convert My File, NoteBridge, PaletteKit

## Features

**Completed** (Phases 1, 2, 5):
- ✅ Chrome Web Store publisher (WIF auth, staged publish, rollout)
- ✅ Firefox AMO publisher (web-ext integration, listed/unlisted)
- ✅ Microsoft Edge publisher (Azure AD OAuth2)
- ✅ Manifest validation (cross-browser compatibility)
- ✅ Packaging (.zip, .xpi)
- ✅ CLI interface (`gatekeeper publish`, `gatekeeper validate`)
- ✅ GitHub Actions reusable workflows
- ✅ Retry logic with exponential backoff
- ✅ PII sanitization in logs
- ✅ Structured logging and metrics
- ✅ Health checks for all store APIs
- ✅ Comprehensive test suite (79 tests)
- ✅ Optional error reporting integration

**Pending** (Phases 3-4):
- 🔜 Extension integration (Convert My File, NoteBridge, PaletteKit)
- 🔜 Production deployment and pilot testing
- 🔜 Safari App Store publisher (future)

## Architecture

**Hybrid Dual-Repository Pattern**:

1. **npm Package** (`@littlebearapps/gatekeeper`)
   - Shared publishing logic for all browser stores
   - Browser-specific modules (chrome.js, firefox.js, edge.js, safari.js)
   - CLI interface for ease of use
   - Comprehensive test suite

2. **Coordination Repository** (this repo)
   - Reusable GitHub Actions workflows
   - Integration with CloakPipe/Homeostat
   - Monitoring dashboards
   - Documentation and setup guides

3. **Per-Extension Integration**
   - Minimal workflow (~30-40 lines)
   - Environment-specific secrets
   - Approval gate configuration

**Optional Integrations**:
- Error reporting to external monitoring systems (e.g., GitHub Issues API)
- Custom workflow hooks for advanced automation

*Note: Gatekeeper works standalone. Optional integrations with CloakPipe (error logging) and Homeostat (auto-fix) are available for Little Bear Apps internal use but not required for core functionality.*

## Implementation Plan

**See**: `docs/GATEKEEPER-IMPLEMENTATION-PLAN.md` (3,776 lines, GPT-5 validated)

**Timeline**: 12-17 hours total

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Phase 1 | 5-7 hours | Core npm package (Chrome + Firefox) |
| Phase 2-3 | 3-4 hours | Pilot with Convert My File |
| Phase 4 | 1-2 hours | Rollout to NoteBridge + PaletteKit |
| Phase 5 | 2-3 hours | Edge support |
| Phase 6 | Future | Safari + native app stores |

## Usage

### For Extension Developers

```bash
# Install in your extension repository
npm install --save-dev @littlebearapps/gatekeeper

# Trigger publishing via GitHub Release
# Minimal workflow auto-runs on release creation
```

### CLI Interface

```bash
# Publish to Chrome Web Store
npx gatekeeper publish --browser chrome --item-id abc123

# Publish to all stores
npx gatekeeper publish --browser all

# Validate manifest
npx gatekeeper validate manifest.json
```

## Development

### Prerequisites

**Minimum Requirements**:
- Node.js 18+
- Credentials for at least one browser store (Chrome, Firefox, or Edge)
- GitHub repository with GitHub Actions enabled (for CI/CD workflow)

**Store-Specific Setup**:
- **Chrome**: Chrome Web Store developer account + API credentials
- **Firefox**: Firefox Add-ons developer account + API keys
- **Edge**: Microsoft Partner Center account + credentials

**Optional**:
- GitHub Environments for approval gates (production deployments)

**See**: `docs/GATEKEEPER-IMPLEMENTATION-PLAN.md` for detailed setup guides

### Setup

```bash
# Install dependencies
npm install

# Run tests
npm test

# Smoke tests
npm run smoke
```

### Testing

**Unit Tests**: Vitest (browser publisher modules)
**Integration Tests**: Test fixtures (sample extensions)
**E2E Tests**: Publish to test accounts in browser stores

## Documentation

- **Implementation Plan**: `docs/GATEKEEPER-IMPLEMENTATION-PLAN.md` (complete 3,776-line plan) ⭐
- **Phase 3 Instructions**: `docs/PHASE-3-INSTRUCTIONS.md` (extension integration guide)
- **Development Artifacts**: `docs/codex/` (AI-assisted development process)

### Key Documentation Sections

From `docs/GATEKEEPER-IMPLEMENTATION-PLAN.md`:
1. Executive Summary - What, why, benefits
2. Architecture Overview - Hybrid dual-repository pattern
3. Error Handling - Retry logic and monitoring integration
4. Multi-Browser Support - Chrome, Firefox, Edge, Safari
5. Implementation Phases - 6 phases (12-17 hours total)
6. Prerequisites Checklist - Before you begin
7. Success Criteria - Technical and business metrics

## License

MIT License - See [LICENSE](LICENSE) for details.

Copyright (c) 2025 Little Bear Apps

## Success Criteria

### Technical Success
- ✅ npm package `@littlebearapps/gatekeeper` published
- ✅ Extensions successfully publish to Chrome Web Store
- ✅ Extensions successfully publish to Firefox AMO
- ✅ Extensions successfully publish to Microsoft Edge
- ✅ Approval gates work (GitHub Environments)
- ✅ Error handling and retry logic function correctly

### Business Success
- ⏱️ <10 minutes to add new extension
- 💰 $0/year operating cost (GitHub Actions free tier)
- 🔄 1-click publishing to all stores
- 🐛 Publishing errors auto-fixed within 24 hours

### Browser Support Timeline
- **Phase 1**: Chrome Web Store, Firefox AMO
- **Phase 5**: Microsoft Edge
- **Phase 2**: Safari (future)

## Contributing

Contributions are welcome! Please:
- Follow conventional commit format (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`)
- Run tests before submitting: `npm test`
- See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines
