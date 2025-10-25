# Phase 3: Extension Integration - Gatekeeper

**Extension**: [EXTENSION_NAME] (Convert My File | NoteBridge | PaletteKit)
**Estimated Time**: 45-60 minutes per extension
**Files**: 2-3 new/modified files
**Repository**: Extension repository (NOT gatekeeper repo)

---

## Non-Negotiable Policies

**⚠️ CRITICAL - Confirm these before coding:**

1. **Feature Branch Only**: Create and use `feature/integrate-gatekeeper`. NEVER use main.
2. **No Git Operations**: Skip all git commands. User will handle commits/PRs.
3. **Plain-English Summary**: End with summary of all tasks completed.
4. **Output Format**:
   - New files: Print full file content
   - Modified files: Print minimal unified diff with 3 lines of context
5. **Max Files**: Do not exceed 3 files in this prompt.
6. **Working Directory**: Must be in extension repository (e.g., `/lba/apps/chrome-extensions/convert-my-file/main/`)

---

## Objective

Integrate the Gatekeeper publishing system into the extension repository by:
1. Adding gatekeeper as a development dependency
2. Creating a GitHub Actions workflow that uses the reusable gatekeeper workflow
3. Preserving existing manual release workflow as backup

This enables automated publishing to Chrome Web Store, Firefox AMO, and Microsoft Edge when a GitHub Release is created.

---

## Current State Analysis

**Before starting, you should:**
- Verify current working directory is the extension repo (NOT gatekeeper repo)
- Check `package.json` exists
- Check `manifest.json` exists
- Note existing `.github/workflows/` files (we'll preserve them)

---

## Repository Context

**Extension Repository Structure**:
```
[extension-name]/
├── .github/
│   └── workflows/
│       ├── ci.yml              # Existing - preserve
│       ├── pr-checks.yml       # Existing - preserve
│       ├── release.yml         # Existing - rename to release-legacy.yml
│       └── publish.yml         # New - create this
├── manifest.json               # Existing - don't modify
├── package.json                # Existing - add gatekeeper dependency
└── ... (extension source files)
```

**Gatekeeper Coordination Repo**:
- Location: `https://github.com/littlebearapps/gatekeeper`
- Reusable Workflow: `.github/workflows/publish-extension.yml`
- Status: ✅ Merged to main, production ready

---

## Tasks

### Task 1: Add Gatekeeper Dependency

**File**: `package.json`

**Action**: Add gatekeeper as a dev dependency

**Change**:
```diff
   "devDependencies": {
+    "@littlebearapps/gatekeeper": "^0.1.0",
     "@playwright/test": "^1.55.0",
     ...
```

**Notes**:
- Add alphabetically in devDependencies
- Use `^0.1.0` for semver compatibility
- Do NOT run `npm install` (user will do this)

---

### Task 2: Create Gatekeeper Publishing Workflow

**File**: `.github/workflows/publish.yml` (NEW)

**Purpose**: Triggered when GitHub Release is created, publishes extension to all browser stores

**Full Content**:
```yaml
name: Publish to Browser Stores

on:
  release:
    types: [published]
  workflow_dispatch:
    inputs:
      stores:
        description: 'Comma-separated stores to publish to (chrome,firefox,edge)'
        required: true
        default: 'chrome,firefox,edge'
        type: string
      dry-run:
        description: 'Dry run (validate only, do not publish)'
        required: false
        default: false
        type: boolean

jobs:
  publish:
    name: 🚀 Publish Extension
    uses: littlebearapps/gatekeeper/.github/workflows/publish-extension.yml@main
    with:
      manifest-path: 'manifest.json'
      stores: ${{ github.event_name == 'workflow_dispatch' && inputs.stores || 'chrome,firefox,edge' }}
      extension-name: '[EXTENSION_NAME]'
    secrets:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      CWS_PUBLISHER_ID: ${{ secrets.CWS_PUBLISHER_ID }}
      CWS_ITEM_ID: ${{ secrets.CWS_ITEM_ID }}
      CWS_WIF_CONFIG: ${{ secrets.CWS_WIF_CONFIG }}
      AMO_API_KEY: ${{ secrets.AMO_API_KEY }}
      AMO_API_SECRET: ${{ secrets.AMO_API_SECRET }}
      EDGE_CLIENT_ID: ${{ secrets.EDGE_CLIENT_ID }}
      EDGE_CLIENT_SECRET: ${{ secrets.EDGE_CLIENT_SECRET }}
      EDGE_PRODUCT_ID: ${{ secrets.EDGE_PRODUCT_ID }}
```

**Important**:
- Replace `[EXTENSION_NAME]` with actual extension name (e.g., "Convert My File")
- Uses reusable workflow from gatekeeper repo (`@main`)
- Triggered by GitHub Release creation OR manual workflow dispatch
- Manual dispatch allows testing single stores or dry-run
- Requires `production` environment (approval gate configured in gatekeeper workflow)

---

### Task 3: Rename Existing Release Workflow (Optional)

**File**: `.github/workflows/release.yml` → `.github/workflows/release-legacy.yml`

**Action**: Rename existing release workflow to preserve it as backup

**Notes**:
- This preserves the manual release process
- User can delete this later if gatekeeper works well
- Do NOT modify the content, just indicate it should be renamed
- If no `release.yml` exists, skip this task

**Output for this task**:
```
RECOMMENDED ACTION (manual):
Rename .github/workflows/release.yml → .github/workflows/release-legacy.yml
This preserves the existing manual release workflow as a backup.
```

---

## Environment Secrets Required

**User must configure these in GitHub** (do NOT include in code):

### Chrome Web Store
- `CWS_PUBLISHER_ID` - Chrome publisher ID
- `CWS_ITEM_ID` - Extension item ID
- `CWS_WIF_CONFIG` - Workload Identity Federation JSON config

### Firefox AMO
- `AMO_API_KEY` - Firefox Add-ons API key
- `AMO_API_SECRET` - Firefox Add-ons API secret

### Microsoft Edge
- `EDGE_CLIENT_ID` - Azure AD client ID
- `EDGE_CLIENT_SECRET` - Azure AD client secret
- `EDGE_PRODUCT_ID` - Edge product ID

**Note**: Remind user to configure these in GitHub Settings → Secrets → Actions

---

## Acceptance Criteria

**package.json**:
1. ✅ Gatekeeper added to devDependencies
2. ✅ Version is `^0.1.0`
3. ✅ Alphabetically ordered in dependencies

**publish.yml**:
4. ✅ Uses reusable workflow from `littlebearapps/gatekeeper@main`
5. ✅ Triggered by GitHub Release creation
6. ✅ Supports manual workflow dispatch with options
7. ✅ Passes all required secrets
8. ✅ Uses correct manifest path (`manifest.json`)
9. ✅ Extension name matches actual extension name
10. ✅ Stores default to `chrome,firefox,edge`

**Preservation**:
11. ✅ Existing workflows (ci.yml, pr-checks.yml) unchanged
12. ✅ Legacy release workflow preserved (renamed)
13. ✅ No changes to extension source code

---

## Testing Instructions

**After integration, user should:**

1. **Install gatekeeper locally**:
   ```bash
   npm install
   ```

2. **Test workflow syntax**:
   ```bash
   # Workflows are validated automatically by GitHub on push
   # Check Actions tab after pushing
   ```

3. **Dry-run test (requires secrets configured)**:
   - Go to Actions tab
   - Select "Publish to Browser Stores"
   - Click "Run workflow"
   - Select stores: `chrome`
   - Enable dry-run: `true`
   - Run workflow
   - Verify validation passes

4. **Production test (create release)**:
   - Create GitHub Release (e.g., `v1.0.1`)
   - Workflow auto-triggers
   - Monitor progress in Actions tab
   - Verify extension published to stores
   - Check for Homeostat error reports if failures occur

---

## Output Format

**For new file (publish.yml)**:
```
=== .github/workflows/publish.yml ===
[full file content here]
```

**For modified file (package.json)**:
```
=== package.json ===
--- a/package.json
+++ b/package.json
@@ line,count +line,count @@
[minimal unified diff with 3 lines context]
```

**For rename operation (release.yml)**:
```
=== MANUAL ACTION REQUIRED ===
Rename: .github/workflows/release.yml → .github/workflows/release-legacy.yml
Reason: Preserve existing manual release workflow as backup
```

**No git commands**.

---

## Checklist: Confirm Before Coding

Before implementing, confirm:
- [ ] Working directory: Extension repo (e.g., `/lba/apps/chrome-extensions/convert-my-file/main/`)
- [ ] Feature branch: `feature/integrate-gatekeeper` (NO main)
- [ ] No git operations (user handles)
- [ ] Max 3 files (package.json + publish.yml + note about release.yml)
- [ ] All acceptance criteria understood (13 items)
- [ ] Output format: full content for new files, minimal diffs for modified
- [ ] Plain-English summary at end
- [ ] Replace `[EXTENSION_NAME]` placeholder with actual extension name

Once confirmed, proceed with implementation.

---

## End Summary Format

After implementation, provide:
```
**Extension**: [Actual extension name]
**Files Created**: [list file paths]
**Files Modified**: [list file paths]
**Manual Actions**: [rename operations]
**Key Decisions**: [2-3 bullets on workflow design choices]
**Testing Steps**: [how to test integration]
**Next Steps**: [configure secrets, test dry-run, create release]
**Secrets Required**: [list of GitHub secrets user must configure]
**Ready for**: [Pilot testing after secrets configured]
```

---

## Notes for User

**After running this prompt:**

1. **Review Changes**: Check package.json and publish.yml
2. **Commit & Push**:
   ```bash
   git add package.json .github/workflows/publish.yml
   git commit -m "feat: integrate gatekeeper publishing system"
   git push
   ```
3. **Configure Secrets**: Add all required secrets in GitHub Settings
4. **Test Dry-Run**: Use manual workflow dispatch with dry-run enabled
5. **Create Release**: Test production publishing with a release
6. **Monitor**: Check Actions tab for workflow execution
7. **Homeostat**: Publishing errors auto-create GitHub issues

**Repeat for Other Extensions**:
- Run same prompt in NoteBridge repository
- Run same prompt in PaletteKit repository
- Each extension gets its own secrets configuration

---

## Extension-Specific Notes

### Convert My File
- **Manifest**: `manifest.json`
- **Extension Name**: "Convert My File"
- **Current Version**: 1.0.0
- **Stores**: Chrome (primary), Firefox (planned), Edge (planned)

### NoteBridge
- **Manifest**: `manifest.json`
- **Extension Name**: "NoteBridge"
- **Stores**: Chrome, Firefox, Edge

### PaletteKit
- **Manifest**: `manifest.json`
- **Extension Name**: "PaletteKit"
- **Stores**: Chrome, Firefox, Edge

---

## Troubleshooting

### "Cannot find reusable workflow"
- **Cause**: Gatekeeper repo not accessible or workflow doesn't exist
- **Fix**: Verify `littlebearapps/gatekeeper/.github/workflows/publish-extension.yml` exists on main branch

### "Secrets not found"
- **Cause**: Secrets not configured in GitHub
- **Fix**: Configure all required secrets in GitHub Settings → Secrets → Actions

### "Environment 'production' not found"
- **Cause**: Production environment not configured in gatekeeper repo
- **Fix**: User should configure production environment with approval gates

### "Gatekeeper command not found"
- **Cause**: npm package not published or not installed
- **Fix**: Verify `@littlebearapps/gatekeeper@0.1.0` is published to npm

---

## References

- **Gatekeeper Repo**: https://github.com/littlebearapps/gatekeeper
- **Reusable Workflow**: `.github/workflows/publish-extension.yml@main`
- **Implementation Plan**: `gatekeeper/docs/GATEKEEPER-IMPLEMENTATION-PLAN.md`
- **Chrome Web Store API**: https://developer.chrome.com/docs/webstore/api_index/
- **Firefox AMO API**: https://addons-server.readthedocs.io/
- **Edge Add-ons API**: https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/publish/api/
