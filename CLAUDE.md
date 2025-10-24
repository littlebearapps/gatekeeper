# CLAUDE.md - Gatekeeper

**Last Updated**: 2025-10-24
**Status**: Initial Setup

---

## Overview

**Gatekeeper** - Centralized browser extension publishing system for Little Bear Apps.

**Purpose**: Automates deployment to multiple browser stores (Chrome, Firefox, Edge, Safari) while integrating seamlessly with Logger and Homeostat infrastructure.

**What It Does**:
- Validates extension manifests (cross-browser compatibility)
- Packages extensions (.zip, .xpi, .crx)
- Publishes to browser stores (Chrome Web Store, Firefox AMO, Edge Store, Safari)
- Reports publishing errors to Logger → Homeostat for automated fixes
- Provides approval gates via GitHub Environments

**Architecture**: Hybrid dual-repository pattern
- **npm Package**: `@littlebearapps/gatekeeper` (shared publishing logic)
- **Coordination Repo**: This repository (orchestration, monitoring, workflows)
- **Per-Extension**: Minimal integration (~30-40 lines per extension)

**Key Benefits**:
- **65% Code Reduction**: 1,680 lines total vs 4,800 for per-extension approach
- **67% Maintenance Savings**: Bug fixes in 1 place vs 3-12 places
- **$0/year Operating Cost**: GitHub Actions included
- **Scales Easily**: Adding extension = 10 minutes (vs 2 hours)

**Implementation Plan**: See `docs/GATEKEEPER-IMPLEMENTATION-PLAN.md` (3,776 lines, GPT-5 validated)

---

## 📖 Quick Start

**Before starting work, read these files**:

1. **`CLAUDE.md`** - This file (project overview)
2. **`~/claude-code-tools/docs/QUICK-REFERENCE.md`** - Comprehensive workflows ⭐
3. **`~/claude-code-tools/.claude-instructions`** - Global development standards

---

## Project Structure

```
gatekeeper/
├── .bare/              # Bare git repository
└── main/               # Working directory (main branch + feature branches)
    ├── .mcp.json      # MCP server configuration
    ├── CLAUDE.md      # This file
    └── README.md      # Project documentation
```

---

## Git Workflow

**Repository**: `github.com/littlebearapps/gatekeeper` (private)

**Branch Strategy**: Feature-Branch Workflow (GitHub Flow)
- Main branch: `main` (protected)
- Feature branches: `feature/*`, `fix/*`, `chore/*`
- Pull requests required for all changes to main

**Working Directory**: `/Users/nathanschram/claude-code-tools/lba/infrastructure/gatekeeper/main/`

### Common Git Commands

```bash
# Start new feature
cd ~/claude-code-tools/lba/infrastructure/gatekeeper/main
git checkout -b feature/my-feature
# Make changes, commit

# Ship feature (automated)
# User: "Use git-workflow-manager to ship this feature"
```

---

## MCP Configuration

**Zen Instance**: Instance K (port 7521)

**Servers Available**:
- zen (dedicated instance I)
- brave-search (shared)
- context7 (shared)
- mult-fetch (shared)

**Test MCP**: Run `/mcp` command to verify all servers connected

**Profile**: Currently using `lean` profile (zen only)
- Switch profiles: `mcp-research` or `mcp-full` (requires new Claude Code session)
- Check current: `mcp-status`

---

## Key Files

- **`CLAUDE.md`** - This file (UPDATE "Current Focus" when work completes)
- **`README.md`** - Project documentation
- **`docs/GATEKEEPER-IMPLEMENTATION-PLAN.md`** - Complete implementation plan (GPT-5 validated) ⭐
- **`.mcp.json`** - MCP server configuration (symlink to active profile)
- **`package.json`** - npm package configuration (to be created)
- **`.github/workflows/`** - Reusable publishing workflows (to be created)

---

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

---

## Technology Stack

**Language**: Node.js / JavaScript
**Package Manager**: npm
**Testing**: Vitest (unit + integration tests)
**CI/CD**: GitHub Actions

**Dependencies** (Planned):
- `chrome-webstore-upload` - Chrome Web Store API v2
- `web-ext` - Firefox AMO Signing API
- `@littlebearapps/logger-integration` - Error reporting
- GitHub Actions workflows for deployment

**Architecture**:
- npm package (`@littlebearapps/gatekeeper`) - Publishing logic
- Coordination repo (this repo) - Orchestration and monitoring
- Per-extension integration - Minimal workflows (~30-40 lines)

---

## Development

### Setup

```bash
# Clone/navigate
cd ~/claude-code-tools/lba/infrastructure/gatekeeper/main

# Verify MCP
claude
# In Claude Code: /mcp
```

### Testing

[To be defined]

### Deployment

[To be defined]

---

## Documentation Hierarchy

**When looking for information, check in this order**:

1. **`CLAUDE.md`** - This file (project overview)
2. **`README.md`** - Project documentation
3. **`~/claude-code-tools/docs/QUICK-REFERENCE.md`** - Workflows and systems ⭐
4. **`~/claude-code-tools/docs/systems/`** - Detailed system docs
   - `MCP-CONFIGURATION.md` - MCP setup and troubleshooting
   - `KEYCHAIN-MANAGEMENT.md` - Secrets management
   - `BACKUP-AUTOMATION.md` - Backup systems
   - `MONITORING.md` - Cache health and usage
5. **`~/claude-code-tools/docs/standards/`** - Development standards
   - `COMMIT-STANDARDS.md` - Conventional commits
   - `PR-TEMPLATE.md` - Pull request template
   - `GITIGNORE-STANDARDS.md` - .gitignore patterns
6. **`~/claude-code-tools/.claude-instructions`** - Global rules (read-only)

---

## Troubleshooting

### MCP Issues

**Servers not connecting?**
- Check profile: `mcp-status`
- Verify symlink: `ls -la .mcp.json`
- Test connection: `/mcp` in Claude Code
- **See**: `~/claude-code-tools/docs/systems/MCP-CONFIGURATION.md`

### Git Workflow Issues

**Feature branch workflow questions?**
- **See**: `~/claude-code-tools/docs/QUICK-REFERENCE.md` - Git workflow section
- **Use**: git-workflow-manager subagent for automated PR workflow

### General Troubleshooting

**For system-wide issues**:
- MCP: `~/claude-code-tools/docs/systems/MCP-CONFIGURATION.md`
- Secrets: `~/claude-code-tools/docs/systems/KEYCHAIN-MANAGEMENT.md`
- Backups: `~/claude-code-tools/docs/systems/BACKUP-AUTOMATION.md`
- Monitoring: `~/claude-code-tools/docs/systems/MONITORING.md`

---

## Subagents

**Available** (see `~/claude-code-tools/subagents/README.md`):

| Subagent | Version | Purpose | Usage |
|----------|---------|---------|-------|
| **git-workflow-manager** | v0.2.0 | Feature-branch PR workflow | "Use git-workflow-manager to ship this feature" |
| **multi-project-tester** | v0.1.0 | Test across projects | "Use multi-project-tester to run tests" |
| **microtool-creator** | v0.1.0 | Scaffold new microtools | (Not applicable for infrastructure tools) |

---

## Related Projects

**Other Infrastructure Tools**:
- **SEO Ads Expert**: `~/claude-code-tools/lba/infrastructure/tools/seo-ads-expert/main/`
- **Auditor Toolkit**: `~/claude-code-tools/lba/tools/auditor-toolkit/main/`

**Shared Infrastructure**:
- **Root Directory**: `~/claude-code-tools/` (Systems & Infrastructure)

---

## Quick Commands

```bash
# Navigate to project
cd ~/claude-code-tools/lba/infrastructure/gatekeeper/main

# Check MCP status
mcp-status

# Switch MCP profile
mcp-research  # zen + brave + context7
mcp-full      # all 5 servers

# Test changes
[To be defined]

# Ship feature
# "Use git-workflow-manager to ship this feature"
```

---

## Resources

**Root Documentation**:
- Quick Reference: `~/claude-code-tools/docs/QUICK-REFERENCE.md` ⭐
- Enhancement Catalog: `~/claude-code-tools/ENHANCEMENTS.md`
- Subagents Guide: `~/claude-code-tools/subagents/README.md`

**Standards**:
- Commits: `~/claude-code-tools/docs/standards/COMMIT-STANDARDS.md`
- PRs: `~/claude-code-tools/docs/standards/PR-TEMPLATE.md`
- .gitignore: `~/claude-code-tools/docs/standards/GITIGNORE-STANDARDS.md`

**Templates**:
- Implementation plans: `~/claude-code-tools/docs/plans/template-plan.md`
- Codex prompts: `~/claude-code-tools/docs/templates/CODEX-PROMPT-TEMPLATE.md`
