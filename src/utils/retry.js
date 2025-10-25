import {
  APIError,
  AuthenticationError,
  NetworkError,
  QuotaExceededError,
  ValidationError
} from '../core/errors.js';

function isAbortSignal(signal) {
  return signal && typeof signal === 'object' && 'aborted' in signal;
}

function isNetworkCode(code) {
  return typeof code === 'string' && ['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', 'ENOTFOUND', 'EPIPE'].includes(code);
}

function extractStatus(error) {
  return error?.status ?? error?.context?.status ?? error?.response?.status ?? null;
}

export class RetryHandler {
  constructor(config = {}) {
    this.maxAttempts = Math.max(1, config.maxAttempts ?? 3);
    this.initialDelay = config.initialDelay ?? 1000;
    this.maxDelay = config.maxDelay ?? 30000;
    this.backoffMultiplier = config.backoffMultiplier ?? 2;
  }

  async execute(fn, options = {}) {
    const maxAttempts = Math.max(1, options.maxAttempts ?? this.maxAttempts);
    const signal = options.signal;
    const onRetry = options.onRetry;
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      if (isAbortSignal(signal) && signal.aborted) {
        throw signal.reason ?? new Error('Retry aborted');
      }

      try {
        const result = await fn({ attempt });
        return result;
      } catch (error) {
        lastError = error;
        if (!this.shouldRetry(error, options) || attempt === maxAttempts) {
          throw error;
        }

        const delayDuration = this.calculateDelay(attempt, options);
        if (typeof onRetry === 'function') {
          await onRetry({ attempt, delay: delayDuration, error });
        }

        await this.wait(delayDuration, signal);
      }
    }

    throw lastError ?? new Error('Retry attempts exhausted');
  }

  shouldRetry(error, options = {}) {
    if (!error) {
      return false;
    }

    if (typeof options.shouldRetry === 'function') {
      return options.shouldRetry(error);
    }

    if (error instanceof ValidationError || error instanceof AuthenticationError) {
      return false;
    }

    if (error instanceof QuotaExceededError || error instanceof NetworkError) {
      return true;
    }

    if (error instanceof APIError) {
      const status = extractStatus(error);
      if (status === 429) {
        return true;
      }

      return typeof status === 'number' && status >= 500 && status < 600;
    }

    const status = extractStatus(error);
    if (status === 429) {
      return true;
    }

    if (typeof status === 'number') {
      if (status >= 500 && status < 600) {
        return true;
      }

      if (status >= 400 && status < 500) {
        return false;
      }
    }

    if (isNetworkCode(error?.code) || isNetworkCode(error?.cause?.code)) {
      return true;
    }

    if (typeof error?.name === 'string' && /fetcherror/i.test(error.name)) {
      return true;
    }

    if (error?.name === 'TypeError' && typeof error?.message === 'string' && /network|fetch failed/i.test(error.message)) {
      return true;
    }

    return false;
  }

  calculateDelay(attempt, options = {}) {
    const initial = options.initialDelay ?? this.initialDelay;
    const multiplier = options.backoffMultiplier ?? this.backoffMultiplier;
    const max = options.maxDelay ?? this.maxDelay;
    const exponent = Math.max(0, attempt - 1);
    const delayValue = initial * multiplier ** exponent;
    return Math.min(max, Math.max(0, delayValue));
  }

  async wait(ms, signal) {
    if (ms <= 0) {
      return;
    }

    if (isAbortSignal(signal)) {
      if (signal.aborted) {
        throw signal.reason ?? new Error('Retry aborted');
      }

      await new Promise((resolve, reject) => {
        let timeoutId;
        const abortListener = () => {
          clearTimeout(timeoutId);
          signal.removeEventListener('abort', abortListener);
          reject(signal.reason ?? new Error('Retry aborted'));
        };

        timeoutId = setTimeout(() => {
          signal.removeEventListener('abort', abortListener);
          resolve();
        }, ms);

        signal.addEventListener('abort', abortListener, { once: true });
      });

      return;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
