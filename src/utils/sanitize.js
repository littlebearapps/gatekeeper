const PII_PATTERNS = [
  { regex: /(gh[pous]_[A-Za-z0-9]{24,})/gi, replacement: '[REDACTED_GITHUB_TOKEN]' },
  { regex: /(sk-[A-Za-z0-9]{16,})/gi, replacement: '[REDACTED_API_KEY]' },
  { regex: /CWS_[A-Za-z0-9_-]+/gi, replacement: '[REDACTED_CWS_CREDENTIAL]' },
  { regex: /AMO_[A-Za-z0-9_-]+/gi, replacement: '[REDACTED_AMO_CREDENTIAL]' },
  { regex: /EDGE_[A-Za-z0-9_-]+/gi, replacement: '[REDACTED_EDGE_CREDENTIAL]' },
  { regex: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, replacement: '[REDACTED_EMAIL]' },
  { regex: /\b[A-Za-z0-9]{40,}\b/g, replacement: '[REDACTED_TOKEN]' }
];

function sanitizeValue(value) {
  if (value == null) {
    return '';
  }

  const raw = String(value);
  return PII_PATTERNS.reduce((acc, { regex, replacement }) => acc.replace(regex, replacement), raw);
}

function cloneAndSanitize(value, seen) {
  if (value == null || typeof value !== 'object') {
    return typeof value === 'string' ? sanitizeValue(value) : value;
  }

  if (seen.has(value)) {
    return Array.isArray(value) ? [] : {};
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => cloneAndSanitize(item, seen));
  }

  const isPlainObject = Object.prototype.toString.call(value) === '[object Object]';
  if (!isPlainObject) {
    return value;
  }

  return Object.entries(value).reduce((acc, [key, val]) => {
    acc[key] = typeof val === 'string' ? sanitizeValue(val) : cloneAndSanitize(val, seen);
    return acc;
  }, {});
}

export class Sanitizer {
  static sanitize(text) {
    return sanitizeValue(text);
  }

  static sanitizeObject(obj) {
    return cloneAndSanitize(obj, new WeakSet());
  }
}
