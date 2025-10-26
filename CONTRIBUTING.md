# Contributing to Gatekeeper

Thank you for your interest in contributing to Gatekeeper! We welcome contributions from the community.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm
- Git

### Setup

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/gatekeeper.git
   cd gatekeeper
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run tests to verify setup:
   ```bash
   npm test
   ```

## Development Process

### Branching

- Create a feature branch from `main`:
  ```bash
  git checkout -b feature/your-feature-name
  ```
- Use descriptive branch names:
  - `feature/` for new features
  - `fix/` for bug fixes
  - `docs/` for documentation updates
  - `refactor/` for code refactoring
  - `test/` for test improvements

### Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>: <description>

[optional body]

[optional footer]
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `test:` - Adding or updating tests
- `refactor:` - Code refactoring
- `chore:` - Maintenance tasks
- `perf:` - Performance improvements

**Examples:**
```bash
feat: add Safari App Store publisher
fix: resolve Chrome Web Store authentication timeout
docs: update quick start guide
test: add integration tests for Firefox publisher
```

### Making Changes

1. Write clean, maintainable code
2. Add tests for new functionality
3. Update documentation as needed
4. Ensure all tests pass: `npm test`
5. Run smoke tests: `npm run smoke`

## Pull Request Process

1. **Update Documentation**: Ensure README and relevant docs reflect your changes
2. **Add Tests**: New features must include tests
3. **Pass All Tests**: Verify `npm test` passes locally
4. **Update CHANGELOG**: Add entry for your changes (if applicable)
5. **Create Pull Request**:
   - Use a clear, descriptive title
   - Reference any related issues
   - Describe what changed and why
   - Include testing steps

### Pull Request Template

When you create a PR, please include:

```markdown
## Description
[Clear description of the changes]

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring
- [ ] Other (please describe)

## Testing
- [ ] Tests pass locally
- [ ] Added new tests for new functionality
- [ ] Smoke tests pass

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings or errors
```

## Coding Standards

### Style Guide

- Use ES6+ JavaScript features
- Use 2-space indentation
- Use descriptive variable and function names
- Add comments for complex logic
- Keep functions focused and small

### File Structure

```
src/
├── cli.js              # CLI entry point
├── core/               # Core utilities
├── publishers/         # Store-specific publishers
└── utils/              # Shared utilities
```

### Error Handling

- Use custom error classes from `src/core/errors.js`
- Always sanitize PII from error messages
- Include context in error messages

### Testing

- Write unit tests for all new code
- Place tests in `test/unit/` directory
- Use descriptive test names
- Mock external dependencies

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- test/unit/publishers/chrome.test.js

# Run smoke tests
npm run smoke
```

### Writing Tests

Example test structure:

```javascript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChromePublisher } from '../../../src/publishers/chrome.js';

describe('ChromePublisher', () => {
  let publisher;

  beforeEach(() => {
    publisher = new ChromePublisher({
      publisherId: 'test',
      itemId: 'test-item',
      wifConfig: {}
    });
  });

  it('should validate manifest successfully', async () => {
    const result = await publisher.validate('/path/to/manifest.json');
    expect(result).toBe(true);
  });
});
```

## Reporting Bugs

Found a bug? Help us fix it!

1. **Check Existing Issues**: Search [GitHub Issues](https://github.com/littlebearapps/gatekeeper/issues) first
2. **Create New Issue**: Use the [bug report template](.github/ISSUE_TEMPLATE/bug-report.md)
   - Our templates follow Little Bear Apps standards (v1.0.0)
   - Available in both web UI and CLI formats
3. **Include** (template will guide you):
   - Clear description of the bug
   - Steps to reproduce
   - Expected vs actual behavior
   - Severity level
   - Environment details (Node version, OS, etc.)
   - Error messages or logs
   - Screenshots if applicable

## Requesting Features

Have an idea? We'd love to hear it!

1. **Check Existing Issues**: See if it's already been requested
2. **Create Feature Request**: Use the [feature request template](.github/ISSUE_TEMPLATE/feature-request.md)
   - Standardized template (v1.0.0) across all Little Bear Apps projects
3. **Include** (template will guide you):
   - Clear description of the feature
   - Problem statement / use case
   - Proposed solution
   - Alternative solutions considered
   - Priority level
   - Willingness to contribute

## Questions?

- Open a [GitHub Discussion](https://github.com/littlebearapps/gatekeeper/discussions) for general questions
- Open an [Issue](https://github.com/littlebearapps/gatekeeper/issues) for bugs or feature requests
- Check existing documentation in `/docs`

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Gatekeeper! 🚀
