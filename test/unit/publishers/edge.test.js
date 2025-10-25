import { EventEmitter } from 'node:events';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const archiverInstances = [];

class FakeArchive extends EventEmitter {
  constructor() {
    super();
    this.globCalls = [];
    this.stream = null;
  }

  pipe(stream) {
    this.stream = stream;
  }

  glob(pattern, options) {
    this.globCalls.push({ pattern, options });
  }

  finalize() {
    if (!this.stream) {
      throw new Error('No output stream provided');
    }

    this.stream.write('fake-zip');
    this.stream.end();
    this.emit('finish');
  }
}

vi.mock('archiver', () => ({
  default: vi.fn(() => {
    const archive = new FakeArchive();
    archiverInstances.push(archive);
    return archive;
  })
}), { virtual: true });

function createJsonResponse(payload, overrides = {}) {
  const json = vi.fn().mockResolvedValue(payload);
  const clone = vi.fn().mockReturnValue({ json: vi.fn().mockResolvedValue(payload) });
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json,
    clone,
    ...overrides
  };
}

const { EdgePublisher } = await import('../../../src/publishers/edge.js');
const {
  APIError,
  AuthenticationError,
  NetworkError,
  PackagingError,
  QuotaExceededError,
  ValidationError
} = await import('../../../src/core/errors.js');

const CONFIG = {
  githubToken: `ghp_${'a'.repeat(36)}`,
  repo: 'littlebearapps/gatekeeper',
  browsers: ['edge'],
  credentials: {
    edge: {
      clientId: 'client-id',
      clientSecret: 'client-secret',
      productId: 'product-id'
    }
  }
};

function createPublisher() {
  return new EdgePublisher(CONFIG);
}

function mockTokenSuccess() {
  fetch.mockResolvedValueOnce(createJsonResponse({ access_token: 'edge-token' }));
}

beforeEach(() => {
  globalThis.fetch = vi.fn();
});

afterEach(() => {
  vi.clearAllMocks();
  archiverInstances.length = 0;
});

describe('EdgePublisher.validate', () => {
  it('accepts a valid manifest', async () => {
    const publisher = createPublisher();
    const manifest = JSON.parse(await readFile(new URL('../../fixtures/edge-manifest.json', import.meta.url), 'utf8'));

    await expect(publisher.validate(manifest)).resolves.toEqual(manifest);
  });

  it('throws when manifest_version is unsupported', async () => {
    const publisher = createPublisher();
    const manifest = { name: 'Edge', version: '1.0.0', manifest_version: 4, icons: { '128': 'icon.png' } };

    await expect(publisher.validate(manifest)).rejects.toThrow(ValidationError);
  });
});

describe('EdgePublisher.package', () => {
  it('creates a zip archive excluding default patterns', async () => {
    const publisher = createPublisher();
    const dir = await mkdtemp(path.join(os.tmpdir(), 'edge-package-'));
    await writeFile(path.join(dir, 'manifest.json'), '{}');
    const outputPath = path.join(dir, '..', `${path.basename(dir)}.zip`);

    const result = await publisher.package(dir, outputPath);

    expect(result).toBe(outputPath);
    expect(archiverInstances).toHaveLength(1);
    const globCall = archiverInstances[0].globCalls[0];
    expect(globCall.options.ignore).toEqual(expect.arrayContaining(['node_modules/**', '.git/**']));
  });

  it('throws PackagingError when manifest path missing', async () => {
    const publisher = createPublisher();

    await expect(publisher.package(undefined, '/tmp/out.zip')).rejects.toThrow(PackagingError);
  });
});

describe('EdgePublisher.upload', () => {
  it('uploads artifact and returns submission id', async () => {
    const publisher = createPublisher();
    const dir = await mkdtemp(path.join(os.tmpdir(), 'edge-upload-'));
    const artifact = path.join(dir, 'bundle.zip');
    await writeFile(artifact, 'zip');

    mockTokenSuccess();
    fetch.mockResolvedValueOnce(createJsonResponse({ submissionId: 'submission-123' }));

    const submissionId = await publisher.upload(artifact);

    expect(submissionId).toBe('submission-123');
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('login.microsoftonline.com'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/submissions/draft/package'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('throws AuthenticationError when upload is unauthorized', async () => {
    const publisher = createPublisher();
    const dir = await mkdtemp(path.join(os.tmpdir(), 'edge-upload-auth-'));
    const artifact = path.join(dir, 'bundle.zip');
    await writeFile(artifact, 'zip');

    mockTokenSuccess();
    fetch.mockResolvedValueOnce(
      createJsonResponse(
        { error: 'Unauthorized' },
        { ok: false, status: 401, statusText: 'Unauthorized' }
      )
    );

    await expect(publisher.upload(artifact)).rejects.toThrow(AuthenticationError);
  });

  it('throws QuotaExceededError when Edge API returns 429', async () => {
    const publisher = createPublisher();
    const dir = await mkdtemp(path.join(os.tmpdir(), 'edge-upload-quota-'));
    const artifact = path.join(dir, 'bundle.zip');
    await writeFile(artifact, 'zip');

    mockTokenSuccess();
    fetch.mockResolvedValueOnce(
      createJsonResponse(
        { error: 'Too Many Requests' },
        { ok: false, status: 429, statusText: 'Too Many Requests' }
      )
    );

    await expect(publisher.upload(artifact)).rejects.toThrow(QuotaExceededError);
  });

  it('throws NetworkError when token request fails', async () => {
    const publisher = createPublisher();
    const dir = await mkdtemp(path.join(os.tmpdir(), 'edge-upload-network-'));
    const artifact = path.join(dir, 'bundle.zip');
    await writeFile(artifact, 'zip');

    fetch.mockRejectedValueOnce(new Error('network down'));

    await expect(publisher.upload(artifact)).rejects.toThrow(NetworkError);
  });
});

describe('EdgePublisher.publish', () => {
  it('submits the upload for review and returns status', async () => {
    const publisher = createPublisher();
    mockTokenSuccess();
    fetch.mockResolvedValueOnce(createJsonResponse({ id: 'submission-123', status: 'InProgress' }));

    const result = await publisher.publish('submission-123', undefined, { notes: 'Release notes' });

    expect(result).toEqual({ success: true, submissionId: 'submission-123', status: 'InProgress' });
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/products/product-id/submissions'),
      expect.objectContaining({ method: 'POST' })
    );
    const [, request] = fetch.mock.calls[1];
    expect(request.body).toContain('Release notes');
  });

  it('throws ValidationError when uploadId missing', async () => {
    const publisher = createPublisher();

    await expect(publisher.publish()).rejects.toThrow(ValidationError);
  });

  it('throws AuthenticationError when publish unauthorized', async () => {
    const publisher = createPublisher();
    mockTokenSuccess();
    fetch.mockResolvedValueOnce(
      createJsonResponse(
        { error: 'Unauthorized' },
        { ok: false, status: 403, statusText: 'Forbidden' }
      )
    );

    await expect(publisher.publish('submission-123')).rejects.toThrow(AuthenticationError);
  });
});

describe('EdgePublisher.cancel', () => {
  it('cancels a submission by id', async () => {
    const publisher = createPublisher();
    mockTokenSuccess();
    fetch.mockResolvedValueOnce(createJsonResponse({ cancelled: true }));

    const result = await publisher.cancel('submission-123');

    expect(result).toEqual({ cancelled: true });
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/submissions/submission-123'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('propagates API errors when cancellation fails', async () => {
    const publisher = createPublisher();
    mockTokenSuccess();
    fetch.mockResolvedValueOnce(
      createJsonResponse(
        { error: 'Not Found' },
        { ok: false, status: 404, statusText: 'Not Found' }
      )
    );

    await expect(publisher.cancel('bad-id')).rejects.toThrow(APIError);
  });
});
