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

const API_BASE_URL = 'https://api.addons.microsoftedge.microsoft.com/v1';
const TOKEN_SCOPE = 'https://api.addons.microsoftedge.microsoft.com/.default';
const DEFAULT_TENANT = 'organizations';
const EXCLUDES = ['node_modules/**', '.git/**', 'test/**', 'tests/**', 'docs/**'];

let archiverFactory;

async function loadArchiver() {
  if (!archiverFactory) {
    ({ default: archiverFactory } = await import('archiver'));
  }

  return archiverFactory;
}

function ensureEdgeCredentials(credentials = {}) {
  if (!credentials?.clientId || !credentials?.clientSecret || !credentials?.productId) {
    throw new AuthenticationError('Edge credentials are incomplete');
  }

  return {
    ...credentials,
    tenantId: credentials.tenantId ?? DEFAULT_TENANT
  };
}

function createTokenUrl(tenantId) {
  const normalized = typeof tenantId === 'string' && tenantId.trim().length > 0 ? tenantId.trim() : DEFAULT_TENANT;
  return `https://login.microsoftonline.com/${normalized}/oauth2/v2.0/token`;
}

function handleErrorResponse(response, payload) {
  const context = {
    status: response.status,
    statusText: response.statusText,
    body: payload
  };

  if (response.status === 401 || response.status === 403) {
    throw new AuthenticationError('Edge authentication failed', context);
  }

  if (response.status === 429) {
    throw new QuotaExceededError('Edge API quota exceeded', context);
  }

  throw new APIError('Edge API request failed', context);
}

async function ensurePathExists(targetPath, errorMessage) {
  try {
    await access(targetPath);
  } catch (error) {
    throw new ValidationError(errorMessage ?? `Path not found: ${targetPath}`);
  }
}

export class EdgePublisher extends BasePublisher {
  constructor(config) {
    super(config);
    this.credentials = ensureEdgeCredentials(this.config.credentials?.edge);
    this.apiBase = API_BASE_URL;
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

    if (![2, 3].includes(manifest.manifest_version)) {
      throw new ValidationError('Edge supports manifest_version 2 or 3 only');
    }

    if (!manifest.icons || typeof manifest.icons !== 'object' || Object.keys(manifest.icons).length === 0) {
      throw new ValidationError('Manifest must specify at least one icon for Edge');
    }

    if (options.manifestPath) {
      await ensurePathExists(options.manifestPath, 'Manifest directory not found for validation');
    }

    return manifest;
  }

  async package(manifestPath, outputPath) {
    if (!manifestPath || typeof manifestPath !== 'string') {
      throw new PackagingError('Manifest path must be provided');
    }

    await ensurePathExists(manifestPath, 'Manifest directory not found for packaging');

    const resolvedOutput = outputPath ?? path.join(os.tmpdir(), `${path.basename(manifestPath)}.zip`);
    const archiver = await loadArchiver();

    try {
      await mkdir(path.dirname(resolvedOutput), { recursive: true });

      const archive = archiver('zip', { zlib: { level: 9 } });
      const output = createWriteStream(resolvedOutput);

      return await new Promise((resolve, reject) => {
        const rejectWithPackagingError = (error) =>
          reject(new PackagingError(error?.message ?? 'Failed to package Edge extension'));

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

      throw new PackagingError(error?.message ?? 'Failed to package Edge extension');
    }
  }

  async upload(artifact, credentials = this.credentials) {
    await this.ensureArtifactExists(artifact);
    const edgeCredentials = ensureEdgeCredentials(credentials);
    const url = `${this.apiBase}/products/${edgeCredentials.productId}/submissions/draft/package`;

    return this.performAuthorizedRequest(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/zip'
        },
        body: createReadStream(artifact)
      },
      edgeCredentials,
      (response, payload) => {
        if (!response.ok) {
          handleErrorResponse(response, payload);
        }

        const submissionId = payload?.submissionId ?? payload?.id;
        if (!submissionId) {
          throw new APIError('Edge upload response missing submission identifier', { body: payload });
        }

        return submissionId;
      }
    );
  }

  async publish(uploadId, credentials = this.credentials, options = {}) {
    if (!uploadId) {
      throw new ValidationError('uploadId is required for Edge publish');
    }

    const edgeCredentials = ensureEdgeCredentials(credentials);
    const url = `${this.apiBase}/products/${edgeCredentials.productId}/submissions`;
    const body = {
      submissionId: uploadId,
      notes: options.notes ?? undefined
    };

    return this.performAuthorizedRequest(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      },
      edgeCredentials,
      (response, payload) => {
        if (!response.ok) {
          handleErrorResponse(response, payload);
        }

        return {
          success: true,
          submissionId: payload?.id ?? uploadId,
          status: payload?.status ?? 'submitted'
        };
      }
    );
  }

  async cancel(uploadId, credentials = this.credentials) {
    const edgeCredentials = ensureEdgeCredentials(credentials);
    const pathSegment = uploadId ? `submissions/${uploadId}` : 'submissions/draft';
    const url = `${this.apiBase}/products/${edgeCredentials.productId}/${pathSegment}`;

    return this.performAuthorizedRequest(
      url,
      { method: 'DELETE' },
      edgeCredentials,
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
        Accept: 'application/json',
        ...(options.headers ?? {})
      };

      const response = await fetch(url, { ...options, headers });
      const payload = await this.safeJson(response);
      return await onSuccess(response, payload);
    } catch (error) {
      if (error instanceof APIError || error instanceof AuthenticationError || error instanceof QuotaExceededError) {
        throw error;
      }

      throw new NetworkError(error?.message ?? 'Edge network request failed');
    }
  }

  async getAccessToken(credentials = this.credentials) {
    const edgeCredentials = ensureEdgeCredentials(credentials);
    const url = createTokenUrl(edgeCredentials.tenantId);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: edgeCredentials.clientId,
          client_secret: edgeCredentials.clientSecret,
          grant_type: 'client_credentials',
          scope: TOKEN_SCOPE
        })
      });

      const payload = await this.safeJson(response);
      if (!response.ok) {
        handleErrorResponse(response, payload);
      }

      const token = payload?.access_token;
      if (!token) {
        throw new AuthenticationError('Edge access token response was empty', { body: payload });
      }

      return token;
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof APIError || error instanceof QuotaExceededError) {
        throw error;
      }

      throw new NetworkError(error?.message ?? 'Edge token request failed');
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
    if (!response || typeof response.json !== 'function') {
      return null;
    }

    try {
      if (typeof response.clone === 'function') {
        const cloned = response.clone();
        if (cloned && typeof cloned.json === 'function') {
          return await cloned.json();
        }
      }

      return await response.json();
    } catch (error) {
      return null;
    }
  }
}
