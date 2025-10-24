import { EventEmitter } from 'node:events';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const webExtLintMock = vi.fn(async () => ({ errors: [] }));
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
      throw new Error('No stream provided to archive');
    }

    this.stream.write('fake-zip');
    this.stream.end();
    this.emit('finish');
  }
}

vi.mock('google-auth-library', () => ({
  GoogleAuth: vi.fn(() => ({
    getAccessToken: vi.fn().mockResolvedValue('test-token')
  }))
}), { virtual: true });

vi.mock('web-ext', () => ({
  cmd: {
    lint: webExtLintMock
  }
}), { virtual: true });

vi.mock('archiver', () => ({
  default: vi.fn(() => {
    const archive = new FakeArchive();
    archiverInstances.push(archive);
    return archive;
  })
}), { virtual: true });

const { ChromePublisher } = await import('../../../src/publishers/chrome.js');
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
  browsers: ['chrome'],
  credentials: {
    chrome: {
      publisherId: 'pub-123',
      itemId: 'item-456',
      wifConfig: { projectId: 'lba', clientEmail: 'svc@project.iam.gserviceaccount.com' }
    }
  }
};

function createPublisher() {
  return new ChromePublisher(CONFIG);
}

beforeEach(() => {
  globalThis.fetch = vi.fn();
  webExtLintMock.mockResolvedValue({ errors: [] });
});

afterEach(() => {
  vi.clearAllMocks();
  archiverInstances.length = 0;
});

describe('ChromePublisher.validate', () => {
  it('validates manifest and invokes web-ext lint when path provided', async () => {
    const publisher = createPublisher();
    const manifestPath = '/tmp/extension';
    const manifest = JSON.parse(await readFile(new URL('../../fixtures/chrome-manifest.json', import.meta.url), 'utf8'));

    await publisher.validate(manifest, { manifestPath });

    expect(webExtLintMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceDir: manifestPath,
        boring: true
      }),
      { shouldExitProgram: false }
    );
  });

  it('throws ValidationError when manifest missing required field', async () => {
    const publisher = createPublisher();

    await expect(publisher.validate({ name: 'Test' })).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError when lint reports errors', async () => {
    const publisher = createPublisher();
    webExtLintMock.mockResolvedValue({ errors: ['missing icon'] });
    const manifest = JSON.parse(await readFile(new URL('../../fixtures/chrome-manifest.json', import.meta.url), 'utf8'));

    await expect(publisher.validate(manifest, { manifestPath: '/tmp/ext' })).rejects.toThrow(ValidationError);
  });
});

describe('ChromePublisher.package', () => {
  it('packages the extension directory while respecting excludes', async () => {
    const publisher = createPublisher();
    const dir = await mkdtemp(path.join(os.tmpdir(), 'chrome-publisher-'));
    await writeFile(path.join(dir, 'manifest.json'), '{}');
    const outputPath = path.join(dir, '..', `${path.basename(dir)}.zip`);

    const resultPath = await publisher.package(dir, outputPath);

    expect(resultPath).toBe(outputPath);
    expect(archiverInstances).toHaveLength(1);
    const { options } = archiverInstances[0].globCalls[0];
    expect(options.ignore).toEqual(expect.arrayContaining(['node_modules/**', '.git/**']));
  });

  it('throws PackagingError when manifest path missing', async () => {
    const publisher = createPublisher();

    await expect(publisher.package(null, '/tmp/out.zip')).rejects.toThrow(PackagingError);
  });
});

describe('ChromePublisher.upload', () => {
  it('uploads artifact and returns item id on success', async () => {
    const publisher = createPublisher();
    const artifactDir = await mkdtemp(path.join(os.tmpdir(), 'chrome-upload-'));
    const artifactPath = path.join(artifactDir, 'build.zip');
    await writeFile(artifactPath, 'zip');

    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: vi.fn().mockResolvedValue({ item_id: 'uploaded-item' })
    });

    const result = await publisher.upload(artifactPath);

    expect(result).toBe('uploaded-item');
    expect(fetch).toHaveBeenCalledWith(
      'https://www.googleapis.com/chromewebstore/v1.1/items/item-456',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
          'x-goog-api-version': '2',
          'Content-Type': 'application/zip'
        })
      })
    );
  });

  it('throws AuthenticationError on unauthorized response', async () => {
    const publisher = createPublisher();
    const artifactDir = await mkdtemp(path.join(os.tmpdir(), 'chrome-upload-'));
    const artifactPath = path.join(artifactDir, 'build.zip');
    await writeFile(artifactPath, 'zip');

    fetch.mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: vi.fn().mockResolvedValue({})
    });

    await expect(publisher.upload(artifactPath)).rejects.toThrow(AuthenticationError);
  });

  it('throws NetworkError on fetch failure', async () => {
    const publisher = createPublisher();
    const artifactDir = await mkdtemp(path.join(os.tmpdir(), 'chrome-upload-'));
    const artifactPath = path.join(artifactDir, 'build.zip');
    await writeFile(artifactPath, 'zip');

    fetch.mockRejectedValue(new Error('network down'));

    await expect(publisher.upload(artifactPath)).rejects.toThrow(NetworkError);
  });
});

describe('ChromePublisher.publish', () => {
  it('publishes with trusted testers target and percentage rollout', async () => {
    const publisher = createPublisher();
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: vi.fn().mockResolvedValue({ status: 'OK', item: { crxVersionLink: 'https://chrome' } })
    });

    const result = await publisher.publish('upload-1', CONFIG.credentials.chrome, {
      target: 'trustedTesters',
      percentageRollout: 25
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('publishTarget=trustedTesters'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ uploadId: 'upload-1' })
      })
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('percentageRollout=25'),
      expect.anything()
    );
    expect(result).toEqual({ success: true, url: 'https://chrome' });
  });

  it('throws ValidationError for invalid target', async () => {
    const publisher = createPublisher();

    await expect(
      publisher.publish('upload-1', CONFIG.credentials.chrome, { target: 'beta' })
    ).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError for invalid rollout percentage', async () => {
    const publisher = createPublisher();

    await expect(
      publisher.publish('upload-1', CONFIG.credentials.chrome, { percentageRollout: 150 })
    ).rejects.toThrow(ValidationError);
  });

  it('throws QuotaExceededError on 429 response', async () => {
    const publisher = createPublisher();
    fetch.mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      json: vi.fn().mockResolvedValue({})
    });

    await expect(publisher.publish('upload-1')).rejects.toThrow(QuotaExceededError);
  });
});

describe('ChromePublisher.cancel', () => {
  it('cancels a pending publish', async () => {
    const publisher = createPublisher();
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: vi.fn().mockResolvedValue({})
    });

    const result = await publisher.cancel('edit-1');

    expect(result).toEqual({ cancelled: true });
    expect(fetch).toHaveBeenCalledWith(
      'https://www.googleapis.com/chromewebstore/v1.1/items/item-456/edits/edit-1:cancelPublish',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('throws APIError on server failure', async () => {
    const publisher = createPublisher();
    fetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      json: vi.fn().mockResolvedValue({ message: 'boom' })
    });

    await expect(publisher.cancel('edit-1')).rejects.toThrow(APIError);
  });
});
