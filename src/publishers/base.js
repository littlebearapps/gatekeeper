import { ConfigValidator } from '../core/config.js';
import { ValidationError } from '../core/errors.js';

const SANITIZE_PATTERNS = [
  { regex: /(gh[pous]_[A-Za-z0-9]{24,})/gi, replacement: '[REDACTED_TOKEN]' },
  { regex: /CWS_[A-Za-z0-9_-]+/gi, replacement: '[REDACTED_CWS]' },
  { regex: /AMO_[A-Za-z0-9_-]+/gi, replacement: '[REDACTED_AMO]' },
  { regex: /EDGE_[A-Za-z0-9_-]+/gi, replacement: '[REDACTED_EDGE]' },
  { regex: /[A-Za-z0-9]{40,}/g, replacement: '[REDACTED_TOKEN]' },
  { regex: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, replacement: '[REDACTED_EMAIL]' }
];

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

    const text = typeof logs === 'string' ? logs : JSON.stringify(logs, null, 2);
    return SANITIZE_PATTERNS.reduce((acc, { regex, replacement }) => acc.replace(regex, replacement), text);
  }

  async reportError(error, context = {}) {
    const normalizedError = ensureError(error);
    const serializedContext = typeof context === 'string' ? context : JSON.stringify(context, null, 2);
    const sanitizedContext = await this.sanitizeLogs(serializedContext);
    // eslint-disable-next-line no-console
    console.error('Publishing error:', normalizedError.message, sanitizedContext);
  }
}
