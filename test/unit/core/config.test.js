import { describe, expect, it } from 'vitest';
import { ConfigValidator } from '../../../src/core/config.js';
import { ValidationError } from '../../../src/core/errors.js';

const BASE_CONFIG = {
  githubToken: 'ghp_tokenvalue1234567890',
  repo: 'littlebearapps/gatekeeper',
  browsers: ['chrome', 'firefox', 'edge'],
  credentials: {
    chrome: {
      publisherId: 'publisher',
      itemId: 'item',
      wifConfig: { projectId: 'proj' }
    },
    firefox: {
      apiKey: 'key',
      apiSecret: 'secret'
    },
    edge: {
      clientId: 'client',
      clientSecret: 'client-secret',
      productId: 'product'
    }
  }
};

describe('ConfigValidator.validate', () => {
  it('returns normalized configuration when valid', () => {
    const validated = ConfigValidator.validate(BASE_CONFIG);

    expect(validated).toEqual({
      githubToken: BASE_CONFIG.githubToken,
      repo: BASE_CONFIG.repo,
      browsers: ['chrome', 'firefox', 'edge'],
      credentials: {
        chrome: BASE_CONFIG.credentials.chrome,
        firefox: BASE_CONFIG.credentials.firefox,
        edge: BASE_CONFIG.credentials.edge
      }
    });
  });

  it('throws when configuration is not an object', () => {
    expect(() => ConfigValidator.validate(null)).toThrowError(ValidationError);
  });

  it('throws when github token is invalid', () => {
    expect(() => ConfigValidator.validate({
      ...BASE_CONFIG,
      githubToken: 'token'
    })).toThrowError(ValidationError);
  });

  it('throws when repo format invalid', () => {
    expect(() => ConfigValidator.validate({
      ...BASE_CONFIG,
      repo: 'invalidRepo'
    })).toThrowError(ValidationError);
  });

  it('throws when browsers array empty', () => {
    expect(() => ConfigValidator.validate({
      ...BASE_CONFIG,
      browsers: []
    })).toThrowError(ValidationError);
  });

  it('throws when browsers contain duplicates', () => {
    expect(() => ConfigValidator.validate({
      ...BASE_CONFIG,
      browsers: ['chrome', 'chrome']
    })).toThrowError(ValidationError);
  });

  it('throws when credentials missing for browser', () => {
    const { firefox, ...partialCreds } = BASE_CONFIG.credentials;
    expect(() => ConfigValidator.validate({
      ...BASE_CONFIG,
      credentials: partialCreds,
      browsers: ['chrome', 'firefox']
    })).toThrowError(ValidationError);
  });

  it('throws when credential field missing', () => {
    expect(() => ConfigValidator.validate({
      ...BASE_CONFIG,
      credentials: {
        ...BASE_CONFIG.credentials,
        chrome: {
          publisherId: 'publisher',
          itemId: 'item'
        }
      }
    })).toThrowError(ValidationError);
  });
});

describe('ConfigValidator.getDefault', () => {
  it('returns an empty scaffold matching schema shape', () => {
    expect(ConfigValidator.getDefault()).toEqual({
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
    });
  });
});
