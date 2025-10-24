import { ValidationError } from './errors.js';

export const CONFIG_SCHEMA = {
  githubToken: { type: 'string', required: true, pattern: /^ghp_[A-Za-z0-9]+$/ },
  repo: { type: 'string', required: true, pattern: /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/ },
  browsers: { type: 'array', required: true, items: ['chrome', 'firefox', 'edge'] },
  credentials: {
    chrome: {
      publisherId: { type: 'string', required: true },
      itemId: { type: 'string', required: true },
      wifConfig: { type: 'object', required: true }
    },
    firefox: {
      apiKey: { type: 'string', required: true },
      apiSecret: { type: 'string', required: true }
    },
    edge: {
      clientId: { type: 'string', required: true },
      clientSecret: { type: 'string', required: true },
      productId: { type: 'string', required: true }
    }
  }
};

const ALLOWED_BROWSERS = new Set(CONFIG_SCHEMA.browsers.items);

function assert(condition, message) {
  if (!condition) {
    throw new ValidationError(message);
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export class ConfigValidator {
  static validate(config) {
    if (!isPlainObject(config)) {
      throw new ValidationError('Configuration must be an object.');
    }

    const { githubToken, repo, browsers, credentials } = config;

    assert(typeof githubToken === 'string' && CONFIG_SCHEMA.githubToken.pattern.test(githubToken),
      'githubToken must be a string that starts with "ghp_".');

    assert(typeof repo === 'string' && CONFIG_SCHEMA.repo.pattern.test(repo),
      'repo must be in the format "owner/repo" and contain only alphanumeric, dash, underscore, or dot characters.');

    assert(Array.isArray(browsers) && browsers.length > 0,
      'browsers must be a non-empty array.');

    const uniqueBrowsers = new Set();
    for (const browser of browsers) {
      assert(typeof browser === 'string' && ALLOWED_BROWSERS.has(browser),
        `Unsupported browser "${browser}".`);
      assert(!uniqueBrowsers.has(browser), `Duplicate browser entry "${browser}".`);
      uniqueBrowsers.add(browser);
    }

    assert(isPlainObject(credentials), 'credentials must be an object.');

    const normalizedCredentials = {};

    for (const browser of uniqueBrowsers) {
      const credentialSchema = CONFIG_SCHEMA.credentials[browser];
      const browserCreds = credentials?.[browser];
      assert(isPlainObject(browserCreds), `Missing credentials for ${browser}.`);

      const normalized = {};
      for (const [field, rules] of Object.entries(credentialSchema)) {
        const value = browserCreds[field];
        if (rules.required) {
          if (rules.type === 'object') {
            assert(isPlainObject(value), `${browser} credential "${field}" must be an object.`);
            normalized[field] = value;
          } else {
            assert(typeof value === rules.type, `${browser} credential "${field}" must be a ${rules.type}.`);
            assert(String(value).trim().length > 0, `${browser} credential "${field}" cannot be empty.`);
            normalized[field] = value;
          }
        }
      }

      normalizedCredentials[browser] = normalized;
    }

    return {
      githubToken,
      repo,
      browsers: Array.from(uniqueBrowsers),
      credentials: normalizedCredentials
    };
  }

  static getDefault() {
    return {
      githubToken: '',
      repo: '',
      browsers: [],
      credentials: {
        chrome: {
          publisherId: '',
          itemId: '',
          wifConfig: {}
        },
        firefox: {
          apiKey: '',
          apiSecret: ''
        },
        edge: {
          clientId: '',
          clientSecret: '',
          productId: ''
        }
      }
    };
  }
}
