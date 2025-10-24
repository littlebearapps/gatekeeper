# AI Agent Coordination - Gatekeeper

**Last Updated**: 2025-10-24

---

## 🤖 For Codex (GPT-5)

Welcome! You're working in the **Gatekeeper** project - an infrastructure tool for repository access control and security management.

### First Steps

**CRITICAL**: Before starting any work, read these files in order:

1. **`CLAUDE.md`** - Project overview and quick reference
2. **`README.md`** - Project documentation
3. **`~/claude-code-tools/docs/QUICK-REFERENCE.md`** - Comprehensive workflows guide

### Working Directory Context

**You are in**: `/Users/nathanschram/claude-code-tools/lba/infrastructure/gatekeeper/main/`

**Project Type**: Infrastructure Tool
**Purpose**: [To be defined - security, access control, audit logging]

**Repository**: `github.com/littlebearapps/gatekeeper` (private)

### Git Workflow

**Structure**: Bare repo + main worktree
```
gatekeeper/
├── .bare/              # Bare git repository
└── main/               # Working directory (main branch)
```

**Branch Strategy**: Feature-Branch Workflow (GitHub Flow)
```bash
# Start new feature
git checkout -b feature/my-feature
# Make changes, commit
# Create PR, merge when ready
```

### MCP Configuration

**Instance**: Zen Instance I (port 7519)
**Servers Available**:
- zen (dedicated instance I)
- brave-search (shared - research/full profiles only)
- context7 (shared - research/full profiles only)
- mult-fetch (shared - full profile only)

**Current Profile**: lean (zen only)

**Test MCP**: Run `/mcp` command to verify servers connected

### When to Use Claude Code vs Codex

**Use Claude Code** (Primary agent for this project):
- ✅ Infrastructure development
- ✅ Architecture decisions
- ✅ Multi-file refactoring
- ✅ Documentation writing
- ✅ Security implementation
- ✅ Deep debugging

**Use Codex** (Experimental - if needed):
- ✅ Quick bug fixes
- ✅ Code generation
- ✅ Unit test writing
- ✅ Exploratory prototyping
- ✅ Boilerplate code

**Note**: This project does NOT use /gpt worktree (no Codex integration yet). Claude Code is primary.

### Codex-Specific Instructions

If you're working on a **structured implementation**:

1. **Check for plan**: Look in `docs/plans/` (if exists) for validated implementation plan
2. **Use Codex prompt template**: `~/claude-code-tools/docs/templates/CODEX-PROMPT-TEMPLATE.md`
3. **Reference plan with line numbers**: Use `context_start_text` / `context_end_text`
4. **Follow staged execution**: Break work into stages (Stage 0, 1, 2...)
5. **Verify acceptance criteria**: Check all criteria before marking complete

### Important Constraints

**What NOT to do**:
- ❌ Do NOT work in iCloud directory
- ❌ Do NOT modify `.claude-instructions` (global rules)
- ❌ Do NOT commit secrets or API keys
- ❌ Do NOT create custom MCP instances without coordination
- ❌ Do NOT skip tests or validation

**What TO do**:
- ✅ Work in LOCAL `/Users/nathanschram/claude-code-tools/lba/infrastructure/gatekeeper/main/`
- ✅ Update `CLAUDE.md` "Current Focus" when work completes
- ✅ Test all changes thoroughly
- ✅ Use conventional commits (feat:, fix:, docs:, chore:)
- ✅ Follow feature-branch workflow (no direct commits to main)

### File Hierarchy

**When looking for information, check in this order**:
1. `CLAUDE.md` - Project overview
2. `README.md` - Project documentation
3. `~/claude-code-tools/docs/QUICK-REFERENCE.md` - Comprehensive guide
4. `~/claude-code-tools/docs/systems/` - Detailed system docs
5. `.claude-instructions` - Global rules (read-only)

### Testing & Validation

**Before committing**:
- [Testing requirements TBD based on technology stack]
- Run all tests
- Verify MCP connections
- Check for secrets in code

### Common Tasks

**Test MCP connection**:
```bash
# In Claude Code session
/mcp
# Expected: zen (instI)
```

**Switch MCP profile**:
```bash
mcp-status      # Check current
mcp-research    # Switch to research (zen + brave + context7)
mcp-full        # Switch to full (all 5 servers)
# Start new Claude Code session after switch
```

**Ship feature**:
```bash
# Use git-workflow-manager subagent
# "Use git-workflow-manager to ship this feature"
```

### Getting Help

**Stuck?** Check these resources:
- `CLAUDE.md` - Project overview
- `~/claude-code-tools/docs/QUICK-REFERENCE.md` - Start here
- `~/claude-code-tools/docs/systems/MCP-CONFIGURATION.md` - MCP troubleshooting
- `~/claude-code-tools/docs/standards/` - Development standards

### Handoff to Claude Code

When you're done, **update these files**:
1. `CLAUDE.md` - Update "Current Focus" with your work
2. `README.md` - Update documentation if needed
3. Any project-specific docs

**Leave a summary**: What you did, what files changed, any TODOs.

---

## 🤖 For Claude Code

This file helps Codex (GPT-5) understand the project context quickly.

**You don't need to read this file** - you already have full context loaded via:
- `CLAUDE.md` (auto-loaded)
- `.claude-instructions` (global rules)
- Root documentation

**Use this file to**:
- Understand what Codex needs to know when working here
- Keep gatekeeper documentation consistent with other projects
- Reference when creating Codex prompts

---

## Version History

- **2025-10-24**: Initial creation - gatekeeper project setup
