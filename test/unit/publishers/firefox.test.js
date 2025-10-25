import { EventEmitter } from 'node:events';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const execQueue = [];
const execCalls = [];

const execMock = vi.fn((command, options, callback) => {
  let cb = callback;
  let opts = options;
  if (typeof options === 'function') {
    cb = options;
    opts = undefined;
  }

  execCalls.push({ command, options: opts });
  const plan = execQueue.shift() ?? { stdout: '', stderr: '' };

  if (plan.error) {
    const error = Object.assign(new Error(plan.error.message ?? 'Command failed'), plan.error);
    error.stdout = plan.stdout ?? '';
    error.stderr = plan.stderr ?? '';
    cb(error, plan.stdout ?? '', plan.stderr ?? '');
  } else {
    cb(null, plan.stdout ?? '', plan.stderr ?? '');
  }
});

const CUSTOM_PROMISIFY = Symbol.for('nodejs.util.promisify.custom');

execMock[CUSTOM_PROMISIFY] = (command, options) =>
  new Promise((resolve, reject) => {
    execMock(command, options, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });

vi.mock('node:child_process', () => ({
  exec: execMock
}));

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

    this.stream.write('fake-xpi');
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

const { FirefoxPublisher } = await import('../../../src/publishers/firefox.js');
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
  browsers: ['firefox'],
  credentials: {
    firefox: {
      apiKey: 'amo-api-key',
      apiSecret: 'amo-api-secret'
    }
  }
};

function createPublisher() {
  return new FirefoxPublisher(CONFIG);
}

beforeEach(() => {
  execQueue.length = 0;
  execCalls.length = 0;
  archiverInstances.length = 0;
});

afterEach(() => {
  vi.clearAllMocks();
});

function queueExecSuccess(stdout = '', stderr = '') {
  execQueue.push({ stdout, stderr });
}

function queueExecFailure(error, stdout = '', stderr = '') {
  execQueue.push({ error, stdout, stderr });
}

describe('FirefoxPublisher.validate', () => {
  it('runs web-ext lint when manifest path provided', async () => {
    queueExecSuccess('Lint completed');
    const publisher = createPublisher();
    const manifest = JSON.parse(await readFile(new URL('../../fixtures/firefox-manifest.json', import.meta.url), 'utf8'));

    await publisher.validate(manifest, { manifestPath: '/tmp/firefox-ext' });

    expect(execMock).toHaveBeenCalled();
    expect(execCalls[0].command).toContain('web-ext lint');
    expect(execCalls[0].command).toContain('--source-dir');
  });

  it('throws ValidationError when lint fails', async () => {
    queueExecFailure({ code: 1, message: 'Lint failed' }, '', 'lint error');
    const publisher = createPublisher();
    const manifest = JSON.parse(await readFile(new URL('../../fixtures/firefox-manifest.json', import.meta.url), 'utf8'));

    await expect(publisher.validate(manifest, { manifestPath: '/tmp/firefox-ext' })).rejects.toThrow(ValidationError);
  });
});

describe('FirefoxPublisher.package', () => {
  it('packages the extension directory into an xpi', async () => {
    const publisher = createPublisher();
    const dir = await mkdtemp(path.join(os.tmpdir(), 'firefox-publisher-'));
    await writeFile(path.join(dir, 'manifest.json'), '{}');
    const outputPath = path.join(dir, '..', `${path.basename(dir)}.xpi`);

    const resultPath = await publisher.package(dir, outputPath);

    expect(resultPath).toBe(outputPath);
    expect(archiverInstances).toHaveLength(1);
    const { options } = archiverInstances[0].globCalls[0];
    expect(options.ignore).toEqual(expect.arrayContaining(['node_modules/**', '.git/**']));
  });

  it('throws PackagingError when manifest path missing', async () => {
    const publisher = createPublisher();

    await expect(publisher.package(null, '/tmp/out.xpi')).rejects.toThrow(PackagingError);
  });
});

describe('FirefoxPublisher.upload', () => {
  it('returns artifact path when file exists', async () => {
    const publisher = createPublisher();
    const dir = await mkdtemp(path.join(os.tmpdir(), 'firefox-upload-'));
    const artifactPath = path.join(dir, 'extension.xpi');
    await writeFile(artifactPath, 'xpi');

    const result = await publisher.upload(artifactPath);

    expect(result).toBe(artifactPath);
  });

  it('throws ValidationError when artifact missing', async () => {
    const publisher = createPublisher();

    await expect(publisher.upload('/missing/file.xpi')).rejects.toThrow(ValidationError);
  });
});

describe('FirefoxPublisher.publish', () => {
  it('signs the extension via web-ext', async () => {
    queueExecSuccess('Success https://addons.mozilla.org/addon/test');
    const publisher = createPublisher();
    const sourceDir = await mkdtemp(path.join(os.tmpdir(), 'firefox-source-'));
    await writeFile(path.join(sourceDir, 'manifest.json'), '{}');

    const result = await publisher.publish(sourceDir, CONFIG.credentials.firefox);

    expect(result).toEqual({ success: true, url: 'https://addons.mozilla.org/addon/test' });
    expect(execCalls[0].command).toContain('web-ext sign');
    expect(execCalls[0].command).toContain('--channel listed');
  });

  it('allows overriding channel and sourceDir via options', async () => {
    queueExecSuccess('Done');
    const publisher = createPublisher();
    const sourceDir = await mkdtemp(path.join(os.tmpdir(), 'firefox-source-'));
    const altDir = await mkdtemp(path.join(os.tmpdir(), 'firefox-alt-'));
    await writeFile(path.join(altDir, 'manifest.json'), '{}');

    const result = await publisher.publish(sourceDir, CONFIG.credentials.firefox, {
      channel: 'unlisted',
      sourceDir: altDir,
      id: 'my-addon@example.com'
    });

    expect(result.success).toBe(true);
    expect(execCalls[0].command).toContain('--channel unlisted');
    expect(execCalls[0].command).toContain('--id "my-addon@example.com"');
  });

  it('throws AuthenticationError on credential issues', async () => {
    queueExecFailure({ code: 1, message: 'Unauthorized' }, '', 'unauthorized');
    const publisher = createPublisher();
    const sourceDir = await mkdtemp(path.join(os.tmpdir(), 'firefox-source-'));
    await writeFile(path.join(sourceDir, 'manifest.json'), '{}');

    await expect(publisher.publish(sourceDir, CONFIG.credentials.firefox)).rejects.toThrow(AuthenticationError);
  });

  it('throws QuotaExceededError on rate limiting', async () => {
    queueExecFailure({ code: 1, message: 'Too many requests' }, '', '429 Too Many Requests');
    const publisher = createPublisher();
    const sourceDir = await mkdtemp(path.join(os.tmpdir(), 'firefox-source-'));
    await writeFile(path.join(sourceDir, 'manifest.json'), '{}');

    await expect(publisher.publish(sourceDir, CONFIG.credentials.firefox)).rejects.toThrow(QuotaExceededError);
  });

  it('throws APIError for other failures', async () => {
    queueExecFailure({ code: 1, message: 'Other failure' }, '', 'unexpected');
    const publisher = createPublisher();
    const sourceDir = await mkdtemp(path.join(os.tmpdir(), 'firefox-source-'));
    await writeFile(path.join(sourceDir, 'manifest.json'), '{}');

    await expect(publisher.publish(sourceDir, CONFIG.credentials.firefox)).rejects.toThrow(APIError);
  });

  it('throws NetworkError when web-ext command is unavailable', async () => {
    queueExecFailure({ code: 'ENOENT', message: 'not found' }, '', '');
    const publisher = createPublisher();
    const sourceDir = await mkdtemp(path.join(os.tmpdir(), 'firefox-source-'));
    await writeFile(path.join(sourceDir, 'manifest.json'), '{}');

    await expect(publisher.publish(sourceDir, CONFIG.credentials.firefox)).rejects.toThrow(NetworkError);
  });

  it('throws ValidationError for unsupported channel', async () => {
    queueExecSuccess();
    const publisher = createPublisher();
    const sourceDir = await mkdtemp(path.join(os.tmpdir(), 'firefox-source-'));
    await writeFile(path.join(sourceDir, 'manifest.json'), '{}');

    await expect(
      publisher.publish(sourceDir, CONFIG.credentials.firefox, { channel: 'beta' })
    ).rejects.toThrow(ValidationError);
  });
});

describe('FirefoxPublisher.cancel', () => {
  it('throws APIError because cancellation unsupported', async () => {
    const publisher = createPublisher();

    await expect(publisher.cancel()).rejects.toThrow(APIError);
  });
});

describe('FirefoxPublisher credential enforcement', () => {
  it('throws ValidationError when credentials missing', () => {
    expect(() => new FirefoxPublisher({ ...CONFIG, credentials: {} })).toThrow(ValidationError);
  });
});

