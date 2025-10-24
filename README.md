# Gatekeeper

Centralized browser extension publishing system for Little Bear Apps.

## Status

🎯 **Ready for Phase 1** - Architecture validated (GPT-5), implementation plan complete

## Purpose

Automates deployment to multiple browser stores while integrating with Logger and Homeostat:

**What Gatekeeper Does**:
- ✅ Validates extension manifests (cross-browser compatibility)
- ✅ Packages extensions (.zip, .xpi, .crx)
- ✅ Publishes to browser stores (Chrome, Firefox, Edge, Safari)
- ✅ Reports errors to Logger → Homeostat (automated bug fixing)
- ✅ Provides approval gates via GitHub Environments

**Key Benefits**:
- **65% Code Reduction**: 1,680 lines vs 4,800 for per-extension approach
- **67% Maintenance Savings**: Bug fixes in 1 place vs 3-12
- **Scales Easily**: Adding extension = 10 minutes (vs 2 hours)
- **$0/year Operating Cost**: GitHub Actions included

**Target Extensions**: Convert My File, NoteBridge, PaletteKit

## Architecture

**Hybrid Dual-Repository Pattern**:

1. **npm Package** (`@littlebearapps/gatekeeper`)
   - Shared publishing logic for all browser stores
   - Browser-specific modules (chrome.js, firefox.js, edge.js, safari.js)
   - CLI interface for ease of use
   - Comprehensive test suite

2. **Coordination Repository** (this repo)
   - Reusable GitHub Actions workflows
   - Integration with Logger/Homeostat
   - Monitoring dashboards
   - Documentation and setup guides

3. **Per-Extension Integration**
   - Minimal workflow (~30-40 lines)
   - Environment-specific secrets
   - Approval gate configuration

**Integration with LBA Systems**:
- **Logger**: Publishing errors → GitHub issues
- **Homeostat**: Auto-fix publishing errors (AI-powered)

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

**Before starting implementation, complete**:
- [ ] Google Cloud setup (Chrome Web Store API v2, WIF authentication)
- [ ] Firefox AMO account + API keys
- [ ] Microsoft Edge Partner Center account + credentials
- [ ] GitHub Environments configured (dev, staging, production)
- [ ] Logger deployed and operational
- [ ] Homeostat configured with `robot` label trigger

**See**: `docs/GATEKEEPER-IMPLEMENTATION-PLAN.md` → "Prerequisites Checklist"

### Setup

```bash
# Navigate to project
cd ~/claude-code-tools/lba/infrastructure/gatekeeper/main

# Install dependencies (after Phase 1)
npm install

# Run tests
npm test

# Build package
npm run build
```

### Testing

**Unit Tests**: Vitest (browser publisher modules)
**Integration Tests**: Test fixtures (sample extensions)
**E2E Tests**: Publish to test accounts in browser stores

## Documentation

- **Implementation Plan**: `docs/GATEKEEPER-IMPLEMENTATION-PLAN.md` (complete 3,776-line plan) ⭐
- **Project Guide**: `CLAUDE.md` (development guidelines)
- **Standards**: `~/claude-code-tools/docs/standards/` (commit/PR standards)
- **Workflows**: `~/claude-code-tools/docs/QUICK-REFERENCE.md` (comprehensive guide)

### Key Documentation Sections

From `docs/GATEKEEPER-IMPLEMENTATION-PLAN.md`:
1. Executive Summary - What, why, benefits
2. Architecture Overview - Hybrid dual-repository pattern
3. Integration with Logger/Homeostat - Error handling flow
4. Multi-Browser Support - Chrome, Firefox, Edge, Safari
5. Implementation Phases - 6 phases (12-17 hours total)
6. Prerequisites Checklist - Before you begin
7. Success Criteria - Technical and business metrics

## License

Private - Little Bear Apps

## Success Criteria

### Technical Success
- ✅ npm package `@littlebearapps/gatekeeper` published
- ✅ All 3 extensions successfully publish to Chrome Web Store
- ✅ All 3 extensions successfully publish to Firefox AMO
- ✅ Publishing errors auto-report to Logger
- ✅ Homeostat auto-fixes publishing errors
- ✅ Approval gates work (GitHub Environments)

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

Internal project - Follow conventional commit format and feature-branch workflow.

See `CLAUDE.md` for detailed development guidelines.
