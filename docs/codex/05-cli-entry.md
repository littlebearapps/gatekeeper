# Prompt 05: CLI Entry Point + Smoke Tests + Docs

**Estimated Time**: 60-90 minutes
**Files**: 3-4 new files
**Phase**: 1 (Core npm Package)
**Dependencies**: Prompts 01-04

---

## Non-Negotiable Policies

1. **Feature Branch**: `feature/cli-entry`
2. **No Git Operations**: User handles
3. **Plain-English Summary**: Required
4. **Max Files**: 4

---

## Objective

Create CLI interface for Gatekeeper with publish/validate commands, smoke test script, and basic documentation.

---

## Repo State

**Existing**: Publishers, utilities, errors, config
**New**:
- `src/index.js` - Main entry point
- `src/cli.js` - CLI command handler
- `scripts/smoke-test.js` - Smoke test script
- Update `package.json` - Add bin field

---

## CLI Interface

### Commands

```bash
# Publish to stores
gatekeeper publish --manifest <path> --stores chrome,firefox

# Validate manifest
gatekeeper validate --manifest <path> --stores chrome,firefox

# Cancel publish
gatekeeper cancel --store chrome --upload-id <id>
```

### Implementation

**`src/cli.js`**:
```javascript
import { Command } from 'commander';
import { ChromePublisher } from './publishers/chrome.js';
import { FirefoxPublisher } from './publishers/firefox.js';
import { ConfigValidator } from './core/config.js';

export async function createCLI() {
  const program = new Command();

  program
    .name('gatekeeper')
    .description('Centralized browser extension publishing')
    .version('0.1.0');

  program
    .command('publish')
    .requiredOption('--manifest <path>', 'Path to manifest.json')
    .option('--stores <stores>', 'Comma-separated stores (chrome,firefox,edge)', 'chrome')
    .option('--config <path>', 'Path to config file', '.gatekeeperrc.json')
    .action(async (options) => {
      // Load config
      // Parse stores
      // For each store: validate → package → upload → publish
      // Report results
    });

  program
    .command('validate')
    .requiredOption('--manifest <path>', 'Path to manifest.json')
    .option('--stores <stores>', 'Stores to validate for')
    .action(async (options) => {
      // Load manifest
      // Validate for each store
      // Report validation results
    });

  return program;
}
```

**`src/index.js`**:
```javascript
export { ChromePublisher } from './publishers/chrome.js';
export { FirefoxPublisher } from './publishers/firefox.js';
export { BasePublisher } from './publishers/base.js';
export { ConfigValidator } from './core/config.js';
export * from './core/errors.js';
```

---

## Package.json Updates

**Add bin field**:
```json
{
  "name": "@littlebearapps/gatekeeper",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "gatekeeper": "./src/cli.js"
  },
  "main": "./src/index.js",
  "exports": {
    ".": "./src/index.js"
  }
}
```

---

## Smoke Test Script

**`scripts/smoke-test.js`**:
```javascript
#!/usr/bin/env node

import { ChromePublisher } from '../src/publishers/chrome.js';
import { ConfigValidator } from '../src/core/config.js';

console.log('🧪 Running Gatekeeper smoke tests...\n');

// Test 1: Config validation
console.log('1. Testing config validation...');
try {
  ConfigValidator.validate({
    githubToken: 'invalid',
    repo: 'test/repo',
    browsers: []
  });
  console.log('❌ Should have thrown ValidationError');
} catch (e) {
  console.log('✅ Config validation works');
}

// Test 2: Publisher instantiation
console.log('2. Testing publisher creation...');
const config = {
  githubToken: 'ghp_test',
  repo: 'owner/repo',
  browsers: ['chrome'],
  credentials: {
    chrome: {
      publisherId: 'test',
      itemId: 'test',
      wifConfig: {}
    }
  }
};
const publisher = new ChromePublisher(config);
console.log('✅ Chrome publisher created');

console.log('\n✅ All smoke tests passed!');
```

---

## Acceptance Criteria

**CLI**:
1. ✅ publish command validates → packages → uploads → publishes
2. ✅ validate command validates manifests
3. ✅ --stores option parses comma-separated list
4. ✅ --config option loads external config file
5. ✅ Error messages are user-friendly

**Smoke Tests**:
6. ✅ Tests config validation
7. ✅ Tests publisher instantiation
8. ✅ All tests pass
9. ✅ Script is executable (chmod +x)

**Package.json**:
10. ✅ bin field points to CLI
11. ✅ main/exports point to index.js
12. ✅ Dependencies listed correctly

---

## Test Plan

**Manual CLI Test**:
```bash
npm link
gatekeeper validate --manifest test/fixtures/chrome-manifest.json --stores chrome
gatekeeper publish --help
```

**Smoke Test**:
```bash
node scripts/smoke-test.js
```

---

## Output Format

Full file content for all new/modified files.

---

## Checklist

- [ ] Feature branch `feature/cli-entry`
- [ ] No git ops
- [ ] Max 4 files
- [ ] Smoke tests pass
- [ ] Summary at end
