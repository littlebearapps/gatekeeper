export class PublishingError extends Error {
  constructor(message, context = {}) {
    super(message);
    this.name = new.target.name;
    this.context = context;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace?.(this, new.target);
  }
}

export class ValidationError extends PublishingError {}
export class APIError extends PublishingError {}
export class NetworkError extends PublishingError {}
export class AuthenticationError extends PublishingError {}
export class QuotaExceededError extends PublishingError {}
export class PackagingError extends PublishingError {}

export const ERROR_TYPES = {
  VALIDATION: 'ValidationError',
  API: 'APIError',
  NETWORK: 'NetworkError',
  AUTHENTICATION: 'AuthenticationError',
  QUOTA: 'QuotaExceededError',
  PACKAGING: 'PackagingError'
};
