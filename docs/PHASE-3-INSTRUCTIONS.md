# Phase 3: Extension Integration Instructions

**Status**: ✅ PR#3 Merged | ❌ PR#2 Closed | 🚀 Ready for Extension Integration

---

## Overview

Phase 3 integrates the Gatekeeper publishing system into 3 browser extension repositories:
1. Convert My File
2. NoteBridge
3. PaletteKit

Each extension gets its own integration PR, configured independently.

---

## Prerequisites

### 1. **Publish npm Package** (REQUIRED FIRST)

Before integrating into extensions, publish the gatekeeper package:

```bash
cd ~/claude-code-tools/lba/infrastructure/gatekeeper/main

# Verify tests pass
npm test

# Verify smoke tests pass
npm run smoke

# Publish to npm (or configure private registry)
npm publish --access public
# OR for private:
# npm publish --access restricted
```

**Verify publication**:
```bash
npm view @littlebearapps/gatekeeper
```

---

## Integration Process (Per Extension)

### Step 1: Prepare Extension Repository

```bash
# Navigate to extension
cd ~/claude-code-tools/lba/apps/chrome-extensions/convert-my-file/main

# Create feature branch
git checkout -b feature/integrate-gatekeeper

# Verify starting state
git status
ls -la .github/workflows/
cat manifest.json | grep version
```

### Step 2: Run Codex Prompt

**Prompt Location**: `/Users/nathanschram/claude-code-tools/lba/infrastructure/gatekeeper/main/docs/codex/phase-3-extension-integration.md`

**Instructions**:
1. Open the prompt file
2. **Replace `[EXTENSION_NAME]`** with actual extension name:
   - "Convert My File" (for convert-my-file)
   - "NoteBridge" (for notebridge)
   - "PaletteKit" (for palette-kit)
3. Copy entire prompt content
4. Paste into Codex (OpenAI o1/o3-mini)
5. Ensure Codex is running in the **extension repository**, not gatekeeper repo

**Expected Output from Codex**:
- Modified: `package.json` (adds gatekeeper dependency)
- Created: `.github/workflows/publish.yml` (new publishing workflow)
- Note: Rename `release.yml` → `release-legacy.yml` (manual action)

### Step 3: Review Codex Output

**Verify**:
```bash
# Check package.json changes
git diff package.json

# Check new workflow
cat .github/workflows/publish.yml

# Verify extension name is correct (not placeholder)
grep "extension-name:" .github/workflows/publish.yml
```

**Common Issues**:
- ❌ `[EXTENSION_NAME]` still in publish.yml → Replace with actual name
- ❌ Working directory wrong → Codex ran in gatekeeper repo instead of extension repo
- ❌ Workflow references `@main` → Correct, this is expected

### Step 4: Commit & Push

```bash
# Install gatekeeper dependency
npm install

# Rename legacy workflow (manual)
git mv .github/workflows/release.yml .github/workflows/release-legacy.yml

# Stage changes
git add package.json .github/workflows/publish.yml .github/workflows/release-legacy.yml
git add package-lock.json

# Commit
git commit -m "feat: integrate gatekeeper publishing system

- Add @littlebearapps/gatekeeper dependency
- Create publish.yml workflow using gatekeeper reusable workflow
- Preserve existing release workflow as legacy backup

Enables automated publishing to Chrome, Firefox, and Edge stores"

# Push
git push -u origin feature/integrate-gatekeeper
```

### Step 5: Create Pull Request

```bash
gh pr create --title "feat: integrate gatekeeper publishing system" --body "## Summary
- Add \`@littlebearapps/gatekeeper\` dependency
- Create publish.yml workflow using gatekeeper reusable workflow
- Preserve existing release workflow as legacy backup

## Changes
- **package.json**: Add gatekeeper as dev dependency
- **.github/workflows/publish.yml**: New workflow for automated publishing
- **.github/workflows/release-legacy.yml**: Renamed from release.yml (backup)

## How it Works
1. Create GitHub Release (e.g., v1.0.1)
2. Workflow auto-triggers
3. Calls gatekeeper reusable workflow
4. Publishes to Chrome, Firefox, Edge stores
5. Errors reported to Homeostat for automated fixes

## Testing
- [x] npm install succeeds
- [ ] Configure GitHub secrets (see below)
- [ ] Test dry-run via manual workflow dispatch
- [ ] Test production publish via GitHub Release

## Required Secrets
Configure these in GitHub Settings → Secrets → Actions:
- \`CWS_PUBLISHER_ID\`
- \`CWS_ITEM_ID\`
- \`CWS_WIF_CONFIG\`
- \`AMO_API_KEY\`
- \`AMO_API_SECRET\`
- \`EDGE_CLIENT_ID\`
- \`EDGE_CLIENT_SECRET\`
- \`EDGE_PRODUCT_ID\`

## Next Steps
After merge:
1. Configure all required secrets
2. Test dry-run: Actions → Publish to Browser Stores → Run workflow (dry-run: true)
3. Test production: Create release (e.g., v1.0.1)
4. Monitor Actions tab for execution
5. Verify publishing to stores

## References
- Gatekeeper Repo: https://github.com/littlebearapps/gatekeeper
- Implementation Plan: gatekeeper/docs/GATEKEEPER-IMPLEMENTATION-PLAN.md"
```

### Step 6: Configure GitHub Secrets

After PR is merged, configure secrets:

1. Go to GitHub repo → Settings → Secrets and variables → Actions
2. Add secrets (values from Keychain or existing store credentials):

**Chrome Web Store**:
- `CWS_PUBLISHER_ID`: Your Chrome publisher ID
- `CWS_ITEM_ID`: Extension item ID (from Chrome Web Store)
- `CWS_WIF_CONFIG`: Workload Identity Federation JSON config

**Firefox AMO**:
- `AMO_API_KEY`: Firefox Add-ons API key
- `AMO_API_SECRET`: Firefox Add-ons API secret

**Microsoft Edge**:
- `EDGE_CLIENT_ID`: Azure AD client ID
- `EDGE_CLIENT_SECRET`: Azure AD client secret
- `EDGE_PRODUCT_ID`: Edge product ID

**Note**: Retrieve these from Keychain using:
```bash
source ~/bin/kc.sh
kc_get CWS_PUBLISHER_ID_CONVERT_MY_FILE
# etc.
```

### Step 7: Test Integration

#### Dry-Run Test (Validation Only)

1. Go to Actions tab
2. Select "Publish to Browser Stores"
3. Click "Run workflow"
4. Configure:
   - Branch: `main`
   - Stores: `chrome` (test one store first)
   - Dry-run: `true`
5. Click "Run workflow"
6. Monitor execution
7. Verify validation passes without publishing

#### Production Test (Actual Publishing)

1. Create GitHub Release:
   ```bash
   git tag v1.0.1
   git push origin v1.0.1

   # Or via GitHub UI:
   # Releases → Draft a new release → Tag: v1.0.1 → Publish
   ```
2. Workflow auto-triggers
3. Monitor Actions tab
4. Verify publishing to Chrome/Firefox/Edge
5. Check for errors in Homeostat (GitHub Issues)

---

## Extension-Specific Details

### Convert My File
- **Path**: `~/claude-code-tools/lba/apps/chrome-extensions/convert-my-file/main/`
- **Extension Name**: "Convert My File"
- **Current Version**: 1.0.0
- **Priority**: 🔥 HIGH (pilot extension)
- **Secrets Prefix**: `*_CONVERT_MY_FILE`

### NoteBridge
- **Path**: `~/claude-code-tools/lba/apps/chrome-extensions/notebridge/main/`
- **Extension Name**: "NoteBridge"
- **Current Version**: Check manifest.json
- **Priority**: MEDIUM
- **Secrets Prefix**: `*_NOTEBRIDGE`

### PaletteKit
- **Path**: `~/claude-code-tools/lba/apps/chrome-extensions/palette-kit/main/`
- **Extension Name**: "PaletteKit"
- **Current Version**: Check manifest.json
- **Priority**: MEDIUM
- **Secrets Prefix**: `*_PALETTEKIT`

---

## Timeline

| Extension | Integration | Secret Setup | Testing | Status |
|-----------|-------------|--------------|---------|--------|
| Convert My File | 45 min | 15 min | 30 min | 🔜 Next |
| NoteBridge | 45 min | 15 min | 30 min | ⏳ Pending |
| PaletteKit | 45 min | 15 min | 30 min | ⏳ Pending |

**Total**: ~4.5 hours (includes testing time)

---

## Success Criteria

**Per Extension**:
- ✅ Gatekeeper dependency added
- ✅ publish.yml workflow created
- ✅ Legacy workflow preserved
- ✅ PR merged
- ✅ Secrets configured
- ✅ Dry-run test passes
- ✅ Production publish succeeds
- ✅ Extension live on all 3 stores

**Overall Phase 3**:
- ✅ All 3 extensions integrated
- ✅ All extensions successfully publish to Chrome, Firefox, Edge
- ✅ Homeostat error reporting works
- ✅ No manual publishing required

---

## Troubleshooting

### npm Package Not Found

**Error**: `npm ERR! 404 Not Found - GET https://registry.npmjs.org/@littlebearapps/gatekeeper`

**Cause**: npm package not published yet

**Fix**:
```bash
cd ~/claude-code-tools/lba/infrastructure/gatekeeper/main
npm publish --access public
```

### Workflow Syntax Error

**Error**: YAML parse error in publish.yml

**Cause**: Codex may generate invalid YAML

**Fix**: Validate with:
```bash
cat .github/workflows/publish.yml | python3 -c "import sys, yaml; yaml.safe_load(sys.stdin)"
```

### Secrets Not Available

**Error**: "Secret not found: CWS_PUBLISHER_ID"

**Cause**: Secrets not configured in GitHub

**Fix**: Configure all secrets in GitHub Settings → Secrets → Actions

### Reusable Workflow Not Found

**Error**: "Cannot find reusable workflow: littlebearapps/gatekeeper/.github/workflows/publish-extension.yml@main"

**Cause**: Workflow doesn't exist on main branch

**Fix**: Verify gatekeeper PR#3 is merged:
```bash
gh pr view 3 --repo littlebearapps/gatekeeper --json state
# Should show: {"state":"MERGED"}
```

---

## Next Steps After Phase 3

**Phase 4: Pilot Deployment & Testing**
1. Monitor production publishing for all 3 extensions
2. Verify extensions live on all stores
3. Test Homeostat error reporting (intentionally trigger error)
4. Document any issues discovered
5. Iterate on improvements

**Phase 5: Completed** ✅
- Edge publisher already implemented
- Monitoring already implemented

**Phase 6: Future**
- Safari App Store publisher
- Native app store support
- Additional browser stores

---

## Resources

- **Phase 3 Prompt**: `gatekeeper/docs/codex/phase-3-extension-integration.md`
- **Gatekeeper Repo**: https://github.com/littlebearapps/gatekeeper
- **Implementation Plan**: `gatekeeper/docs/GATEKEEPER-IMPLEMENTATION-PLAN.md`
- **Root Quick Reference**: `~/claude-code-tools/docs/QUICK-REFERENCE.md`
