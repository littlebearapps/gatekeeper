import { createWriteStream } from 'node:fs';
import { access, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { exec as execCallback } from 'node:child_process';
import { promisify } from 'node:util';

import { BasePublisher } from './base.js';
import {
  APIError,
  AuthenticationError,
  NetworkError,
  PackagingError,
  QuotaExceededError,
  ValidationError
} from '../core/errors.js';

const execAsync = promisify(execCallback);

const EXCLUDES = ['node_modules/**', '.git/**', 'test/**', 'tests/**', 'docs/**'];
const DEFAULT_CHANNEL = 'listed';
const ALLOWED_CHANNELS = new Set(['listed', 'unlisted']);

let archiverFactory;

async function loadArchiver() {
  if (!archiverFactory) {
    ({ default: archiverFactory } = await import('archiver'));
  }

  return archiverFactory;
}

function ensureFirefoxCredentials(credentials = {}) {
  if (!credentials?.apiKey || !credentials?.apiSecret) {
    throw new AuthenticationError('Firefox credentials are incomplete');
  }

  return credentials;
}

function quote(value) {
  return JSON.stringify(String(value));
}

function combinedOutput(error) {
  const stdout = 'stdout' in error ? error.stdout : '';
  const stderr = 'stderr' in error ? error.stderr : '';
  return [stdout, stderr]
    .map((chunk) => (chunk ?? '').trim())
    .filter(Boolean)
    .join('\n');
}

async function ensurePathExists(targetPath, errorMessage) {
  try {
    await access(targetPath);
  } catch (error) {
    throw new ValidationError(errorMessage ?? `Path not found: ${targetPath}`);
  }
}

export class FirefoxPublisher extends BasePublisher {
  constructor(config) {
    super(config);
    this.credentials = ensureFirefoxCredentials(this.config.credentials?.firefox);
  }

  async validate(manifest, options = {}) {
    if (!manifest || typeof manifest !== 'object') {
      throw new ValidationError('Manifest must be an object');
    }

    const missing = ['name', 'version', 'manifest_version'].filter((key) => !manifest[key]);
    if (missing.length > 0) {
      throw new ValidationError(`Manifest missing required fields: ${missing.join(', ')}`);
    }

    if (typeof manifest.manifest_version !== 'number') {
      throw new ValidationError('manifest_version must be a number');
    }

    if (options.manifestPath) {
      const lintArtifactsDir = options.artifactsDir ?? path.join(os.tmpdir(), 'gatekeeper-firefox-lint');
      await mkdir(lintArtifactsDir, { recursive: true });
      try {
        await execAsync(
          `web-ext lint --source-dir ${quote(options.manifestPath)} --artifacts-dir ${quote(lintArtifactsDir)} --boring`,
          { env: process.env }
        );
      } catch (error) {
        const output = combinedOutput(error) || error.message || 'Firefox manifest validation failed';
        throw new ValidationError('Firefox manifest validation failed', { output });
      }
    }

    return manifest;
  }

  async package(manifestPath, outputPath) {
    if (!manifestPath || typeof manifestPath !== 'string') {
      throw new PackagingError('Manifest path must be provided');
    }

    await ensurePathExists(manifestPath, 'Manifest directory not found for packaging');

    const resolvedOutput = outputPath ?? path.join(os.tmpdir(), `${path.basename(manifestPath)}.xpi`);
    const archiver = await loadArchiver();

    try {
      await mkdir(path.dirname(resolvedOutput), { recursive: true });

      const archive = archiver('zip', { zlib: { level: 9 } });
      const output = createWriteStream(resolvedOutput);

      return await new Promise((resolve, reject) => {
        const rejectWithPackagingError = (error) =>
          reject(new PackagingError(error.message ?? 'Failed to package Firefox extension'));

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

      throw new PackagingError(error.message ?? 'Failed to package Firefox extension');
    }
  }

  async upload(artifact) {
    if (!artifact || typeof artifact !== 'string') {
      throw new ValidationError('Artifact path must be provided for upload');
    }

    await ensurePathExists(artifact, `Artifact not found at path: ${artifact}`);
    return artifact;
  }

  async publish(uploadId, credentials = this.credentials, options = {}) {
    if (!uploadId) {
      throw new ValidationError('uploadId is required for publish');
    }

    const firefoxCredentials = ensureFirefoxCredentials(credentials);
    const channel = options.channel ?? DEFAULT_CHANNEL;

    if (!ALLOWED_CHANNELS.has(channel)) {
      throw new ValidationError(`Unsupported Firefox channel: ${channel}`);
    }

    const sourceDir = options.sourceDir ?? uploadId;
    if (!sourceDir || typeof sourceDir !== 'string') {
      throw new ValidationError('sourceDir must be provided for Firefox publish');
    }

    await ensurePathExists(sourceDir, 'Source directory not found for Firefox publish');

    const artifactsDir = options.artifactsDir ?? path.join(os.tmpdir(), 'gatekeeper-firefox-sign');
    await mkdir(artifactsDir, { recursive: true });

    const commandParts = [
      'web-ext sign',
      `--source-dir ${quote(sourceDir)}`,
      `--channel ${channel}`,
      `--artifacts-dir ${quote(artifactsDir)}`
    ];

    if (options.id) {
      commandParts.push(`--id ${quote(options.id)}`);
    }

    const command = commandParts.join(' ');

    const env = {
      ...process.env,
      WEB_EXT_API_KEY: firefoxCredentials.apiKey,
      WEB_EXT_API_SECRET: firefoxCredentials.apiSecret
    };

    try {
      const { stdout } = await execAsync(command, { env });
      const urlMatch = stdout?.match(/https?:\/\/\S+/i);
      return {
        success: true,
        url: urlMatch ? urlMatch[0] : ''
      };
    } catch (error) {
      throw this.normalizePublishError(error);
    }
  }

  async cancel() {
    throw new APIError('Firefox AMO does not support cancelling publish operations');
  }

  normalizePublishError(error) {
    const output = combinedOutput(error) || error.message || '';

    if (/401|unauthorized|invalid credentials/i.test(output)) {
      return new AuthenticationError('Firefox AMO authentication failed', { output });
    }

    if (/429|too many requests|rate limit/i.test(output)) {
      return new QuotaExceededError('Firefox AMO rate limit exceeded', { output });
    }

    if (error?.code === 'ENOENT') {
      return new NetworkError('Failed to execute web-ext command', { output });
    }

    return new APIError('Firefox AMO signing failed', { output });
  }
}
