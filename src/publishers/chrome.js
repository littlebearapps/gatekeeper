import { createReadStream, createWriteStream } from 'node:fs';
import { access, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { BasePublisher } from './base.js';
import {
  APIError,
  AuthenticationError,
  NetworkError,
  PackagingError,
  QuotaExceededError,
  ValidationError
} from '../core/errors.js';

const BASE_URL = 'https://www.googleapis.com/chromewebstore/v1.1/items';
const API_VERSION_HEADER = '2';
const ALLOWED_TARGETS = new Set(['default', 'trustedTesters']);
const EXCLUDES = ['node_modules/**', '.git/**', 'test/**', 'tests/**', 'docs/**'];

let GoogleAuthCtor;
let archiverFactory;
let webExtModule;

async function loadGoogleAuth() {
  if (!GoogleAuthCtor) {
    ({ GoogleAuth: GoogleAuthCtor } = await import('google-auth-library'));
  }

  return GoogleAuthCtor;
}

async function loadArchiver() {
  if (!archiverFactory) {
    ({ default: archiverFactory } = await import('archiver'));
  }

  return archiverFactory;
}

async function loadWebExt() {
  if (!webExtModule) {
    webExtModule = await import('web-ext');
  }

  return webExtModule;
}

function ensureChromeCredentials(credentials = {}) {
  if (!credentials || !credentials.itemId || !credentials.publisherId || !credentials.wifConfig) {
    throw new AuthenticationError('Chrome credentials are incomplete');
  }

  return credentials;
}

function handleErrorResponse(response, payload) {
  const context = {
    status: response.status,
    statusText: response.statusText,
    body: payload
  };

  if (response.status === 401 || response.status === 403) {
    throw new AuthenticationError('Chrome Web Store authentication failed', context);
  }

  if (response.status === 429) {
    throw new QuotaExceededError('Chrome Web Store quota exceeded', context);
  }

  throw new APIError('Chrome Web Store API request failed', context);
}

export class ChromePublisher extends BasePublisher {
  constructor(config) {
    super(config);
    this.credentials = ensureChromeCredentials(this.config.credentials?.chrome);
    this.authInstance = null;
    this.authConfigKey = null;
  }

  async validate(manifest, options = {}) {
    if (!manifest || typeof manifest !== 'object') {
      throw new ValidationError('Manifest must be an object');
    }

    const missing = ['name', 'version', 'manifest_version', 'icons'].filter((key) => !manifest[key]);
    if (missing.length > 0) {
      throw new ValidationError(`Manifest missing required fields: ${missing.join(', ')}`);
    }

    if (typeof manifest.manifest_version !== 'number') {
      throw new ValidationError('manifest_version must be a number');
    }

    if (!manifest.icons || typeof manifest.icons !== 'object' || Object.keys(manifest.icons).length === 0) {
      throw new ValidationError('Manifest must specify at least one icon');
    }

    if (options.manifestPath) {
      const webExt = await loadWebExt();
      try {
        const result = await webExt.cmd.lint(
          {
            sourceDir: options.manifestPath,
            artifactsDir: options.artifactsDir ?? path.join(os.tmpdir(), 'gatekeeper-webext'),
            boring: true
          },
          { shouldExitProgram: false }
        );

        if (Array.isArray(result?.errors) && result.errors.length > 0) {
          throw new ValidationError('Chrome manifest validation failed', { errors: result.errors });
        }
      } catch (error) {
        if (error instanceof ValidationError) {
          throw error;
        }

        throw new ValidationError(error.message ?? 'Chrome manifest validation failed');
      }
    }

    return manifest;
  }

  async package(manifestPath, outputPath) {
    if (!manifestPath || typeof manifestPath !== 'string') {
      throw new PackagingError('Manifest path must be provided');
    }

    const resolvedOutput = outputPath ?? path.join(os.tmpdir(), `${path.basename(manifestPath)}.zip`);
    const archiver = await loadArchiver();

    try {
      await access(manifestPath);
      await mkdir(path.dirname(resolvedOutput), { recursive: true });

      const archive = archiver('zip', { zlib: { level: 9 } });
      const output = createWriteStream(resolvedOutput);

      return await new Promise((resolve, reject) => {
        const rejectWithPackagingError = (error) =>
          reject(new PackagingError(error.message ?? 'Failed to package Chrome extension'));

        output.on('error', rejectWithPackagingError);
        archive.on('error', rejectWithPackagingError);
        output.on('close', () => resolve(resolvedOutput));

        archive.pipe(output);
        archive.glob('**/*', { cwd: manifestPath, dot: true, ignore: EXCLUDES });
        archive.finalize();
      });
    } catch (error) {
      if (error instanceof PackagingError) {
        throw error;
      }

      throw new PackagingError(error.message ?? 'Failed to package Chrome extension');
    }
  }

  async upload(artifact, credentials = this.credentials) {
    await this.ensureArtifactExists(artifact);
    const chromeCredentials = ensureChromeCredentials(credentials);
    const url = `${BASE_URL}/${chromeCredentials.itemId}`;

    return this.performAuthorizedRequest(
      url,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/zip'
        },
        body: createReadStream(artifact)
      },
      chromeCredentials,
      (response, payload) => {
        if (!response.ok) {
          handleErrorResponse(response, payload);
        }

        return payload?.item_id ?? payload?.id ?? chromeCredentials.itemId;
      }
    );
  }

  async publish(uploadId, credentials = this.credentials, options = {}) {
    if (!uploadId) {
      throw new ValidationError('uploadId is required for publish');
    }

    const chromeCredentials = ensureChromeCredentials(credentials);
    const target = options.target ?? 'default';

    if (!ALLOWED_TARGETS.has(target)) {
      throw new ValidationError(`Unsupported publish target: ${target}`);
    }

    if (options.percentageRollout != null) {
      const rollout = Number(options.percentageRollout);
      if (!Number.isFinite(rollout) || rollout < 0 || rollout > 100) {
        throw new ValidationError('percentageRollout must be between 0 and 100');
      }
    }

    const params = new URLSearchParams({ publishTarget: target });
    if (options.percentageRollout != null) {
      params.set('percentageRollout', String(options.percentageRollout));
    }

    const url = `${BASE_URL}/${chromeCredentials.itemId}/publish?${params.toString()}`;

    return this.performAuthorizedRequest(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ uploadId })
      },
      chromeCredentials,
      (response, payload) => {
        if (!response.ok) {
          handleErrorResponse(response, payload);
        }

        return {
          success: payload?.status === 'OK' || response.ok,
          url: payload?.item?.crxVersionLink ?? ''
        };
      }
    );
  }

  async cancel(uploadId, credentials = this.credentials) {
    if (!uploadId) {
      throw new ValidationError('uploadId is required to cancel publish');
    }

    const chromeCredentials = ensureChromeCredentials(credentials);
    const url = `${BASE_URL}/${chromeCredentials.itemId}/edits/${uploadId}:cancelPublish`;

    return this.performAuthorizedRequest(
      url,
      { method: 'POST' },
      chromeCredentials,
      (response, payload) => {
        if (!response.ok) {
          handleErrorResponse(response, payload);
        }

        return { cancelled: true };
      }
    );
  }

  async performAuthorizedRequest(url, options, credentials, onSuccess) {
    try {
      const token = await this.getAccessToken(credentials);
      const headers = {
        Authorization: `Bearer ${token}`,
        'x-goog-api-version': API_VERSION_HEADER,
        ...(options.headers ?? {})
      };

      const response = await fetch(url, { ...options, headers });
      const payload = await this.safeJson(response);
      return await onSuccess(response, payload);
    } catch (error) {
      if (error instanceof APIError || error instanceof AuthenticationError || error instanceof QuotaExceededError) {
        throw error;
      }

      throw new NetworkError(error.message ?? 'Chrome Web Store network request failed');
    }
  }

  async getAccessToken(credentials) {
    try {
      const GoogleAuth = await loadGoogleAuth();
      const serialized = JSON.stringify(credentials.wifConfig);
      if (!this.authInstance || this.authConfigKey !== serialized) {
        this.authInstance = new GoogleAuth({
          credentials: credentials.wifConfig,
          scopes: ['https://www.googleapis.com/auth/chromewebstore']
        });
        this.authConfigKey = serialized;
      }

      const token = await this.authInstance.getAccessToken();
      if (!token) {
        throw new AuthenticationError('Failed to obtain Chrome Web Store access token');
      }

      return token;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }

      throw new AuthenticationError(error.message ?? 'Failed to obtain Chrome Web Store access token');
    }
  }

  async ensureArtifactExists(artifact) {
    if (!artifact || typeof artifact !== 'string') {
      throw new ValidationError('Artifact path must be provided for upload');
    }

    try {
      await access(artifact);
    } catch (error) {
      throw new ValidationError(`Artifact not found at path: ${artifact}`);
    }
  }

  async safeJson(response) {
    try {
      if (typeof response.clone === 'function') {
        return await response.clone().json();
      }

      return await response.json();
    } catch (error) {
      return null;
    }
  }
}
