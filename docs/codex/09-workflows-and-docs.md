# Prompt 09: GitHub Actions Workflows + Documentation Updates

**Estimated Time**: 45-60 minutes
**Files**: 4-5 modified files
**Phase**: Completion of PR#2 (Phases 1, 2, 5)
**Dependencies**: Prompts 01-08 (all complete)

---

## Non-Negotiable Policies

**⚠️ CRITICAL - Confirm these before coding:**

1. **Feature Branch**: Continue on `codex/implement-phase-1-for-gatekeeper-2025-10-24-9er8lo`. DO NOT create new branch.
2. **No Git Operations**: Skip all git commands. User will handle commits/PRs.
3. **Plain-English Summary**: End with summary of all tasks completed.
4. **Output Format**:
   - New files: Print full file content
   - Modified files: Print minimal unified diff with 3 lines of context
5. **Max Files**: Do not exceed 5 files in this prompt.

---

## Objective

Complete the gatekeeper coordination repository by adding reusable GitHub Actions workflows and updating documentation to reflect that Phases 1, 2, and 5 are complete.

---

## Repo State

**Current State**: All code complete (Phases 1, 2, 5)
- ✅ Publishers: Chrome, Firefox, Edge
- ✅ Utilities: retry, sanitize, auth
- ✅ CLI: `gatekeeper` command
- ✅ Homeostat integration
- ✅ Monitoring: logger, metrics, health checks
- ✅ Tests: 79 passing

**What's Missing**: GitHub Actions workflows + updated documentation

**Files to Create**:
- `.github/workflows/publish-extension.yml` (new) - Reusable workflow
- `.github/workflows/test.yml` (new) - CI testing workflow

**Files to Modify**:
- `README.md` - Update status from "Ready for Phase 1" to completion status
- `CLAUDE.md` - Update "Current Focus" section
- `docs/codex/00-CONTEXT.md` - Update Rolling Changelog

---

## Shared Context

**Reference**: See `docs/codex/00-CONTEXT.md` for project structure.

**Current Branch**: `codex/implement-phase-1-for-gatekeeper-2025-10-24-9er8lo` (PR #2)

---

## GitHub Actions Workflows

### Reusable Workflow: `publish-extension.yml`

**Purpose**: Called by extension repositories (Convert My File, NoteBridge, PaletteKit) to publish extensions.

**Location**: `.github/workflows/publish-extension.yml`

**Specification**:

```yaml
name: Publish Extension

on:
  workflow_call:
    inputs:
      manifest-path:
        description: 'Path to manifest.json'
        required: true
        type: string
      stores:
        description: 'Comma-separated list of stores (chrome,firefox,edge)'
        required: true
        type: string
      extension-name:
        description: 'Extension name for reporting'
        required: true
        type: string
    secrets:
      GITHUB_TOKEN:
        required: true
      CWS_PUBLISHER_ID:
        required: false
      CWS_ITEM_ID:
        required: false
      CWS_WIF_CONFIG:
        required: false
      AMO_API_KEY:
        required: false
      AMO_API_SECRET:
        required: false
      EDGE_CLIENT_ID:
        required: false
      EDGE_CLIENT_SECRET:
        required: false
      EDGE_PRODUCT_ID:
        required: false

jobs:
  publish:
    runs-on: ubuntu-latest
    environment: production

    steps:
      - name: Checkout extension repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install gatekeeper
        run: npm install -g @littlebearapps/gatekeeper

      - name: Create gatekeeper config
        run: |
          cat > .gatekeeperrc.json << EOF
          {
            "githubToken": "${{ secrets.GITHUB_TOKEN }}",
            "repo": "${{ github.repository }}",
            "browsers": ["${{ inputs.stores }}"],
            "credentials": {
              "chrome": {
                "publisherId": "${{ secrets.CWS_PUBLISHER_ID }}",
                "itemId": "${{ secrets.CWS_ITEM_ID }}",
                "wifConfig": ${{ secrets.CWS_WIF_CONFIG }}
              },
              "firefox": {
                "apiKey": "${{ secrets.AMO_API_KEY }}",
                "apiSecret": "${{ secrets.AMO_API_SECRET }}"
              },
              "edge": {
                "clientId": "${{ secrets.EDGE_CLIENT_ID }}",
                "clientSecret": "${{ secrets.EDGE_CLIENT_SECRET }}",
                "productId": "${{ secrets.EDGE_PRODUCT_ID }}"
              }
            }
          }
          EOF

      - name: Publish to stores
        id: publish
        run: |
          gatekeeper publish \
            --manifest ${{ inputs.manifest-path }} \
            --stores ${{ inputs.stores }} \
            --config .gatekeeperrc.json
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Report results
        if: always()
        run: |
          echo "✅ Published ${{ inputs.extension-name }} to ${{ inputs.stores }}"
          echo "See logs above for details"
```

### CI Testing Workflow: `test.yml`

**Purpose**: Run tests on gatekeeper package on every PR.

**Location**: `.github/workflows/test.yml`

**Specification**:

```yaml
name: Test Gatekeeper

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18, 20]

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Run smoke tests
        run: npm run smoke
```

---

## Documentation Updates

### Update README.md

**Current Status Line**:
```markdown
## Status

🎯 **Ready for Phase 1** - Architecture validated (GPT-5), implementation plan complete
```

**New Status Section**:
```markdown
## Status

✅ **Phase 1 Complete** - Core npm package (Chrome, Firefox)
✅ **Phase 2 Complete** - Homeostat error reporting
✅ **Phase 5 Complete** - Edge publisher + monitoring
🔜 **Phase 3 Next** - Extension integration (3 extensions)
🔜 **Phase 4 Next** - Pilot deployment and testing

**Implementation Status**:
- npm Package: `@littlebearapps/gatekeeper@0.1.0` (ready to publish)
- Tests: 79/79 passing ✅
- Browsers: Chrome ✅ | Firefox ✅ | Edge ✅ | Safari 🔜
- Extensions: 0/3 integrated (Phase 3 pending)
```

**Add after "Purpose" section**:
```markdown
## Features

**Completed** (Phases 1, 2, 5):
- ✅ Chrome Web Store publisher (WIF auth, staged publish, rollout)
- ✅ Firefox AMO publisher (web-ext integration, listed/unlisted)
- ✅ Microsoft Edge publisher (Azure AD OAuth2)
- ✅ Manifest validation (cross-browser compatibility)
- ✅ Packaging (.zip, .xpi)
- ✅ Error reporting to Homeostat (GitHub Issues API)
- ✅ CLI interface (`gatekeeper publish`, `gatekeeper validate`)
- ✅ Retry logic with exponential backoff
- ✅ PII sanitization
- ✅ Structured logging and metrics
- ✅ Health checks for all store APIs
- ✅ Comprehensive test suite (79 tests)

**Pending** (Phases 3-4):
- 🔜 Extension integration (Convert My File, NoteBridge, PaletteKit)
- 🔜 Production deployment and pilot testing
- 🔜 Safari App Store publisher (future)
```

### Update CLAUDE.md

**Current "Current Focus" Section** (lines ~60-80):
```markdown
## Current Focus

**Date**: 2025-10-24
**Task**: Initial project setup complete + Implementation plan integrated

**Status**: 🎯 Ready for Phase 1 Implementation
- ✅ Repository created and configured
- ✅ Bare repo + main worktree structure
- ✅ GitHub repo created (private)
- ✅ MCP configuration (Zen instance K, port 7521)
- ✅ Implementation plan migrated from convert-my-file
- ✅ Project scope defined (centralized extension publishing)
- 🔜 **Next**: Review prerequisites checklist
- 🔜 **Next**: Begin Phase 1 (Core npm package - 5-7 hours)

**Implementation Timeline**: 12-17 hours total
**Target Extensions**: Convert My File, NoteBridge, PaletteKit
**Browser Support**: Chrome (Phase 1), Firefox (Phase 1), Edge (Phase 5), Safari (Phase 2)
```

**New "Current Focus" Section**:
```markdown
## Current Focus

**Date**: 2025-10-25
**Task**: Phases 1, 2, and 5 Complete - Ready for Extension Integration

**Status**: ✅ Core Package Complete, 🔜 Extension Integration Next
- ✅ Phase 1: Core npm package (Chrome, Firefox publishers, CLI, utilities)
- ✅ Phase 2: Homeostat error reporting integration
- ✅ Phase 5: Edge publisher + monitoring (logger, metrics, health)
- ✅ Tests: 79/79 passing
- ✅ Smoke tests: passing
- ✅ PR #2: Ready to merge (needs title update)
- 🔜 **Next**: Publish npm package `@littlebearapps/gatekeeper@0.1.0`
- 🔜 **Next**: Phase 3 - Integrate into 3 extensions (2-3 hours)
- 🔜 **Next**: Phase 4 - Pilot testing (1-2 hours)

**Completed Work** (via Codex prompts 01-09):
- 15 source files, 8 test suites, CLI interface
- Browser support: Chrome, Firefox, Edge
- GitHub Actions reusable workflows
- Documentation updates

**Remaining Timeline**: 3-5 hours (Phases 3-4)
**Target Extensions**: Convert My File, NoteBridge, PaletteKit
```

### Update 00-CONTEXT.md Rolling Changelog

**Current Rolling Changelog** (line ~183):
```markdown
## Rolling Changelog

**Initial State** (2025-10-24):
- Repository structure created
- Implementation plan complete (4,100+ lines, GPT-5 validated)
- Homeostat integration architecture defined
- Ready for Phase 1 implementation
```

**New Rolling Changelog**:
```markdown
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
```

---

## Acceptance Criteria

**GitHub Actions Workflows**:
1. ✅ `publish-extension.yml` is a reusable workflow (`workflow_call`)
2. ✅ Supports all required inputs (manifest-path, stores, extension-name)
3. ✅ Supports all required secrets (GitHub, Chrome, Firefox, Edge)
4. ✅ Uses `ubuntu-latest` runner
5. ✅ Requires `production` environment (approval gate)
6. ✅ Installs gatekeeper from npm
7. ✅ Creates config file from secrets
8. ✅ Runs `gatekeeper publish` command
9. ✅ Reports results
10. ✅ `test.yml` runs on push/PR to main
11. ✅ Tests on Node 18 and 20
12. ✅ Runs unit tests and smoke tests

**Documentation Updates**:
13. ✅ README status reflects Phases 1, 2, 5 complete
14. ✅ README lists all completed features
15. ✅ README shows Phase 3-4 as next steps
16. ✅ CLAUDE.md "Current Focus" updated to 2025-10-25
17. ✅ CLAUDE.md reflects completion status
18. ✅ 00-CONTEXT.md Rolling Changelog updated
19. ✅ All dates/timestamps updated

---

## Test Plan

**Workflow Validation**:
- Validate YAML syntax (no tabs, proper indentation)
- Verify all inputs/secrets referenced correctly
- Check that workflow is reusable (uses `workflow_call`)

**Documentation Review**:
- README status accurate
- CLAUDE.md dates current
- No broken links or references

---

## Output Format

**For new files** (workflows):
```
=== .github/workflows/publish-extension.yml ===
[full file content here]

=== .github/workflows/test.yml ===
[full file content here]
```

**For modified files** (documentation):
```
=== README.md ===
--- a/README.md
+++ b/README.md
@@ -10,3 +10,5 @@
[minimal unified diff with 3 lines context]

=== CLAUDE.md ===
--- a/CLAUDE.md
+++ b/CLAUDE.md
@@ -60,8 +60,12 @@
[minimal unified diff with 3 lines context]

=== docs/codex/00-CONTEXT.md ===
--- a/docs/codex/00-CONTEXT.md
+++ b/docs/codex/00-CONTEXT.md
@@ -183,5 +183,15 @@
[minimal unified diff with 3 lines context]
```

**No git commands**.

---

## Checklist: Confirm Before Coding

Before implementing, confirm:
- [ ] Continuing on branch: `codex/implement-phase-1-for-gatekeeper-2025-10-24-9er8lo` (NO new branch)
- [ ] No git operations (user handles)
- [ ] Max 5 files (2 new workflows + 3 doc updates)
- [ ] All acceptance criteria understood (19 items)
- [ ] Output format: full content for new files, minimal diffs for modified files
- [ ] Plain-English summary at end

Once confirmed, proceed with implementation.

---

## End Summary Format

After implementation, provide:
```
**Files Created**: [list file paths]
**Files Modified**: [list file paths]
**Key Decisions**: [2-3 bullets on workflow design, doc updates]
**How to Test**: [validation steps for workflows, how to verify docs]
**Next Steps**: [What happens after PR#2 merges - Phase 3 work]
**PR#2 Ready**: [Confirm all gatekeeper repo work complete]
```

---

## Notes

- This completes ALL work for the gatekeeper coordination repository (PR#2)
- Phase 3 work happens in **separate repositories** (Convert My File, NoteBridge, PaletteKit)
- Phase 4 is testing/verification (no code commits)
- After this prompt, PR#2 should be ready to merge
- User will update PR#2 title to: `feat: implement gatekeeper core package (phases 1, 2, 5)`
