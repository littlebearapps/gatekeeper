import { ConfigValidator } from '../core/config.js';
import { ValidationError } from '../core/errors.js';
import { Sanitizer } from '../utils/sanitize.js';

function ensureError(error) {
  if (error instanceof Error) {
    return error;
  }

  return new Error(typeof error === 'string' ? error : 'Unknown error');
}

export class BasePublisher {
  constructor(config) {
    try {
      this.config = ConfigValidator.validate(config);
    } catch (error) {
      throw error instanceof ValidationError ? error : new ValidationError(error.message);
    }
  }

  // Abstract methods
  async validate() {
    throw new Error('Not implemented');
  }

  async package() {
    throw new Error('Not implemented');
  }

  async upload() {
    throw new Error('Not implemented');
  }

  async publish() {
    throw new Error('Not implemented');
  }

  async cancel() {
    throw new Error('Not implemented');
  }

  async sanitizeLogs(logs) {
    if (logs == null) {
      return '';
    }

    if (typeof logs === 'string') {
      return Sanitizer.sanitize(logs);
    }

    if (typeof logs === 'object') {
      const sanitizedObject = Sanitizer.sanitizeObject(logs);
      return JSON.stringify(sanitizedObject, null, 2);
    }

    return Sanitizer.sanitize(String(logs));
  }

  async reportError(error, context = {}) {
    const normalizedError = ensureError(error);
    const sanitizedContext = await this.sanitizeLogs(context);
    // eslint-disable-next-line no-console
    console.error('Publishing error:', normalizedError.message, sanitizedContext);
  }
}
