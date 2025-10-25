# Gatekeeper Codex Prompts

**Purpose**: Series of focused prompts for implementing Gatekeeper using Codex (OpenAI o1/o3-mini).

**Last Updated**: 2025-10-24

---

## Quick Start

1. **Read shared context**: Start with `00-CONTEXT.md` to understand project structure
2. **Execute prompts in order**: Follow numerical sequence (01, 02, 03, etc.)
3. **Always use feature branches**: Create a new branch for each prompt
4. **Handle git yourself**: Codex won't perform git operations
5. **Review and commit**: After each prompt, review changes and commit

---

## Prompt Sequence

### Phase 1: Core npm Package (5-7 hours)

| Prompt | File | Focus | Deliverable |
|--------|------|-------|-------------|
| 01 | `01-publisher-interfaces.md` | Interfaces + error taxonomy | BasePublisher, error types, config schema |
| 02 | `02-chrome-publisher.md` | Chrome Web Store | ChromePublisher + mocks + tests |
| 03 | `03-firefox-publisher.md` | Firefox AMO | FirefoxPublisher + mocks + tests |
| 04 | `04-shared-utilities.md` | HTTP/retry/sanitize | Utility modules + tests |
| 05 | `05-cli-entry.md` | CLI + smoke tests | Entry point + docs |

### Phase 2: Homeostat Integration (1 hour)

| Prompt | File | Focus | Deliverable |
|--------|------|-------|-------------|
| 06 | `06-homeostat-reporter.md` | Error reporting | HomeostatReporter + Octokit integration |

### Phase 5: Edge Publisher + Monitoring (2-3 hours)

| Prompt | File | Focus | Deliverable |
|--------|------|-------|-------------|
| 07 | `07-edge-publisher.md` | Microsoft Edge | EdgePublisher + mocks + tests |
| 08 | `08-monitoring.md` | Observability | Logging, metrics, health checks |

### PR#2 Completion: Workflows + Documentation (1 hour)

| Prompt | File | Focus | Deliverable |
|--------|------|-------|-------------|
| 09 | `09-workflows-and-docs.md` | GitHub Actions + docs | Reusable workflows, updated README/CLAUDE.md |

---

## Workflow

### For Each Prompt:

1. **Create feature branch**:
   ```bash
   git checkout -b feature/prompt-01-publisher-interfaces
   ```

2. **Copy prompt to Codex**:
   - Open prompt file (e.g., `01-publisher-interfaces.md`)
   - Copy entire content to Codex
   - Run in gatekeeper directory

3. **Review output**:
   - Verify all files created/modified
   - Run tests if applicable
   - Check for errors

4. **Commit changes**:
   ```bash
   git add .
   git commit -m "feat(publishers): implement base publisher interface and error taxonomy"
   ```

5. **Continue to next prompt**:
   - Create new branch for next prompt
   - Repeat process

---

## Best Practices

### Before Starting

- ✅ Read `00-CONTEXT.md` completely
- ✅ Verify Node.js version (18+)
- ✅ Install dependencies: `npm install`
- ✅ Understand the full implementation plan: `docs/GATEKEEPER-IMPLEMENTATION-PLAN.md`

### During Implementation

- ✅ Execute prompts in numerical order
- ✅ Always create a new feature branch
- ✅ Review Codex output before committing
- ✅ Run tests after each prompt: `npm test`
- ✅ Update `00-CONTEXT.md` Rolling Changelog after significant changes

### After Each Prompt

- ✅ Verify acceptance criteria met
- ✅ Run all tests
- ✅ Commit changes with conventional commit message
- ✅ Document any deviations or issues

---

## Prompt Structure

Each prompt follows this structure (GPT-5 recommended):

1. **Non-negotiable policies** (at top)
   - Feature branch only
   - No git operations
   - Plain-English summary required
   - Max files per prompt

2. **Objective** (1-2 sentences)
3. **Repo state** (relevant files)
4. **Interfaces and contracts** (only what's needed)
5. **Scope and constraints** (Node version, browsers, retry/timeouts)
6. **Acceptance criteria** (functional + error cases)
7. **Test plan** (unit/mocks or smoke script)
8. **Output format** (explicit instructions)
9. **Checklist to confirm** (before coding)

---

## Token Optimization

Each prompt is designed to be **600-1,200 tokens** (hard cap ~1,800):

- **Stable Context**: Shared via `00-CONTEXT.md` (not repeated)
- **Focused Scope**: 1-5 files per prompt
- **Clear Contracts**: Only essential interfaces included
- **Rolling Changelog**: Updated in `00-CONTEXT.md` after each prompt

---

## Troubleshooting

### Codex creates too many files
- **Solution**: Reduce scope, split prompt into smaller units
- **Prevention**: Set explicit file count limit in prompt

### Codex ignores policies
- **Solution**: Re-paste policies at top, require confirmation
- **Prevention**: Use checklist before coding section

### Context drift across prompts
- **Solution**: Update `00-CONTEXT.md` Rolling Changelog
- **Prevention**: Reference stable interfaces from context file

### External API hallucinations
- **Solution**: Provide exact endpoints and payload shapes
- **Prevention**: Use mocks/adapters for external APIs

---

## Notes

**Phase 3 (Extension Integration)** and **Phase 4 (Pilot Deployment)** are handled by user in extension repositories. Codex prompts cover core npm package implementation only.

**Git Operations**: User handles all git operations (commits, PRs, merges). Codex focuses purely on code generation.

**Testing**: Each prompt includes test plan. Run `npm test` after each implementation.

---

## References

- **Codex Best Practices**: GPT-5 analysis in creation of these prompts
- **Full Implementation Plan**: `docs/GATEKEEPER-IMPLEMENTATION-PLAN.md`
- **Shared Context**: `00-CONTEXT.md`
