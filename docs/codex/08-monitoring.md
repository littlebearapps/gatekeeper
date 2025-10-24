# Prompt 08: Monitoring & Observability

**Estimated Time**: 45-60 minutes
**Files**: 3-4 new files
**Phase**: 5 (Monitoring)
**Dependencies**: Prompts 01-07

---

## Non-Negotiable Policies

1. **Feature Branch**: `feature/monitoring`
2. **No Git Operations**: User handles
3. **Plain-English Summary**: Required
4. **Max Files**: 4

---

## Objective

Add structured logging, metrics collection, health checks, and observability for production deployments.

---

## Repo State

**Existing**: All publishers, utilities, CLI, Homeostat integration
**New**:
- `src/core/logger.js` - Structured logging
- `src/core/metrics.js` - Metrics collection
- `src/core/health.js` - Health check endpoint
- Update `src/cli.js` - Add logging throughout

---

## Implementation

### Logger (`src/core/logger.js`)

```javascript
export class Logger {
  constructor(options = {}) {
    this.level = options.level || 'info';
    this.format = options.format || 'json'; // 'json' | 'text'
  }

  log(level, message, context = {}) {
    if (!this.shouldLog(level)) return;

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context
    };

    if (this.format === 'json') {
      console.log(JSON.stringify(entry));
    } else {
      console.log(`[${entry.timestamp}] ${level.toUpperCase()}: ${message}`);
    }
  }

  info(message, context) { this.log('info', message, context); }
  warn(message, context) { this.log('warn', message, context); }
  error(message, context) { this.log('error', message, context); }
  debug(message, context) { this.log('debug', message, context); }

  shouldLog(level) {
    const levels = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }
}
```

### Metrics (`src/core/metrics.js`)

```javascript
export class MetricsCollector {
  constructor() {
    this.metrics = {
      publishAttempts: 0,
      publishSuccesses: 0,
      publishFailures: 0,
      validationFailures: 0,
      uploadFailures: 0,
      apiErrors: 0,
      networkErrors: 0,
      duration: []
    };
  }

  recordPublishAttempt(store) {
    this.metrics.publishAttempts++;
  }

  recordPublishSuccess(store, duration) {
    this.metrics.publishSuccesses++;
    this.metrics.duration.push(duration);
  }

  recordPublishFailure(store, error) {
    this.metrics.publishFailures++;

    if (error.name === 'ValidationError') {
      this.metrics.validationFailures++;
    } else if (error.name === 'NetworkError') {
      this.metrics.networkErrors++;
    } else if (error.name === 'APIError') {
      this.metrics.apiErrors++;
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.publishSuccesses / this.metrics.publishAttempts,
      avgDuration: this.metrics.duration.reduce((a, b) => a + b, 0) / this.metrics.duration.length
    };
  }

  reset() {
    this.metrics = {
      publishAttempts: 0,
      publishSuccesses: 0,
      publishFailures: 0,
      validationFailures: 0,
      uploadFailures: 0,
      apiErrors: 0,
      networkErrors: 0,
      duration: []
    };
  }
}
```

### Health Check (`src/core/health.js`)

```javascript
export class HealthCheck {
  static async check() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      checks: {
        chrome: await this.checkChromeAPI(),
        firefox: await this.checkFirefoxAPI(),
        edge: await this.checkEdgeAPI(),
        github: await this.checkGitHubAPI()
      }
    };
  }

  static async checkChromeAPI() {
    // Ping Chrome Web Store API
    // Return { available: true/false, latency: ms }
  }

  static async checkFirefoxAPI() {
    // Ping AMO API
  }

  static async checkEdgeAPI() {
    // Ping Edge API
  }

  static async checkGitHubAPI() {
    // Ping GitHub API (for Homeostat)
  }
}
```

---

## CLI Integration

**Update `src/cli.js`**:
```javascript
import { Logger } from './core/logger.js';
import { MetricsCollector } from './core/metrics.js';

const logger = new Logger({ level: 'info', format: 'json' });
const metrics = new MetricsCollector();

// In publish command:
logger.info('Starting publish workflow', { manifest: options.manifest, stores: options.stores });
metrics.recordPublishAttempt(store);

// On success:
logger.info('Publish succeeded', { store, duration });
metrics.recordPublishSuccess(store, duration);

// On failure:
logger.error('Publish failed', { store, error: error.message });
metrics.recordPublishFailure(store, error);

// At end:
logger.info('Publish workflow complete', { metrics: metrics.getMetrics() });
```

---

## Acceptance Criteria

**Logger**:
1. ✅ Structured JSON logging
2. ✅ Log levels (debug, info, warn, error)
3. ✅ Context object support
4. ✅ Timestamp on all entries

**Metrics**:
5. ✅ Track publish attempts/successes/failures
6. ✅ Track error types
7. ✅ Calculate success rate
8. ✅ Track duration (avg)

**Health Check**:
9. ✅ Check all store APIs
10. ✅ Return status + latency
11. ✅ Version included

**CLI Integration**:
12. ✅ Log all key events
13. ✅ Record metrics
14. ✅ Output metrics at end

---

## Test Plan

**Unit Tests**: Test logger, metrics, health check
**Manual**: Run publish and verify logs/metrics output

---

## Output Format

Full file content for all new/modified files.

---

## Checklist

- [ ] Feature branch `feature/monitoring`
- [ ] No git ops
- [ ] Max 4 files
- [ ] Structured logging works
- [ ] Summary at end
