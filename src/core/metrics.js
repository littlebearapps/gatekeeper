export class MetricsCollector {
  constructor() {
    this.reset();
  }

  recordPublishAttempt(store) {
    this.metrics.publishAttempts++;
    this.ensureStoreBucket(store);
    this.metrics.perStore[store].attempts++;
  }

  recordPublishSuccess(store, durationMs = 0) {
    this.metrics.publishSuccesses++;
    this.ensureStoreBucket(store);
    this.metrics.perStore[store].successes++;
    this.metrics.duration.push(durationMs);
    this.metrics.perStore[store].durations.push(durationMs);
  }

  recordPublishFailure(store, error) {
    this.metrics.publishFailures++;
    this.ensureStoreBucket(store);
    this.metrics.perStore[store].failures++;

    if (!error || typeof error !== 'object') {
      return;
    }

    const errorName = error.name;

    if (errorName === 'ValidationError') {
      this.metrics.validationFailures++;
      this.metrics.perStore[store].validationFailures++;
    } else if (errorName === 'NetworkError') {
      this.metrics.networkErrors++;
      this.metrics.perStore[store].networkErrors++;
    } else if (errorName === 'APIError') {
      this.metrics.apiErrors++;
      this.metrics.perStore[store].apiErrors++;
    } else if (errorName === 'QuotaExceededError') {
      this.metrics.quotaErrors++;
      this.metrics.perStore[store].quotaErrors++;
    } else if (errorName === 'AuthenticationError') {
      this.metrics.authenticationErrors++;
      this.metrics.perStore[store].authenticationErrors++;
    }
  }

  recordUploadFailure(store, error) {
    this.metrics.uploadFailures++;
    this.recordPublishFailure(store, error);
  }

  ensureStoreBucket(store) {
    if (!store) {
      return;
    }

    if (!this.metrics.perStore[store]) {
      this.metrics.perStore[store] = {
        attempts: 0,
        successes: 0,
        failures: 0,
        validationFailures: 0,
        apiErrors: 0,
        networkErrors: 0,
        quotaErrors: 0,
        authenticationErrors: 0,
        durations: []
      };
    }
  }

  getMetrics() {
    const { publishAttempts, publishSuccesses, duration } = this.metrics;
    const totalDuration = duration.reduce((sum, value) => sum + value, 0);
    const avgDuration = duration.length > 0 ? totalDuration / duration.length : 0;
    const successRate = publishAttempts > 0 ? publishSuccesses / publishAttempts : 0;

    const perStore = Object.fromEntries(
      Object.entries(this.metrics.perStore).map(([store, data]) => {
        const storeTotalDuration = data.durations.reduce((sum, value) => sum + value, 0);
        const storeAvgDuration = data.durations.length > 0 ? storeTotalDuration / data.durations.length : 0;
        const storeSuccessRate = data.attempts > 0 ? data.successes / data.attempts : 0;

        return [store, {
          ...data,
          avgDuration: storeAvgDuration,
          successRate: storeSuccessRate
        }];
      })
    );

    return {
      ...this.metrics,
      perStore,
      successRate,
      avgDuration
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
      quotaErrors: 0,
      authenticationErrors: 0,
      duration: [],
      perStore: {}
    };
  }
}
