#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { Command } from 'commander';

import { ChromePublisher } from './publishers/chrome.js';
import { FirefoxPublisher } from './publishers/firefox.js';
import { ConfigValidator } from './core/config.js';
import { APIError, ValidationError } from './core/errors.js';
import { Sanitizer } from './utils/sanitize.js';

const DEFAULT_CONFIG_PATH = '.gatekeeperrc.json';
const SUPPORTED_STORES = {
  chrome: ChromePublisher,
  firefox: FirefoxPublisher
};

function parseStores(value, fallback = []) {
  const input = value ?? '';
  const stores = input
    .split(',')
    .map((store) => store.trim().toLowerCase())
    .filter(Boolean);

  if (stores.length > 0) {
    return Array.from(new Set(stores));
  }

  return Array.from(new Set(fallback));
}

async function loadJSONFile(filePath, description) {
  const absolutePath = path.resolve(process.cwd(), filePath);

  try {
    const raw = await readFile(absolutePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new ValidationError(`${description} not found at ${absolutePath}`);
    }

    throw new ValidationError(`Unable to parse ${description} at ${absolutePath}: ${error.message}`);
  }
}

function createPublisherInstance(store, config) {
  const Publisher = SUPPORTED_STORES[store];

  if (!Publisher) {
    throw new ValidationError(`Unsupported store: ${store}`);
  }

  const browsers = Array.from(new Set([...(config?.browsers ?? []), store]));
  const normalizedConfig = {
    ...config,
    browsers,
    credentials: config?.credentials ?? {}
  };

  return new Publisher(normalizedConfig);
}

async function validateForStore(publisher, manifest, manifestDir) {
  await publisher.validate(manifest, { manifestPath: manifestDir });
}

async function packageForStore(publisher, manifestDir) {
  return publisher.package(manifestDir);
}

async function uploadForStore(publisher, artifactPath) {
  return publisher.upload(artifactPath);
}

async function publishForStore(store, publisher, uploadId, manifestDir, options) {
  const publishOptions = {};

  if (store === 'chrome') {
    if (options.target) {
      publishOptions.target = options.target;
    }

    if (Number.isFinite(options.percentageRollout)) {
      publishOptions.percentageRollout = options.percentageRollout;
    }
  } else if (store === 'firefox') {
    publishOptions.channel = options.channel;
    publishOptions.sourceDir = manifestDir;
  }

  return publisher.publish(uploadId, undefined, publishOptions);
}

function logInfo(message) {
  // eslint-disable-next-line no-console
  console.log(message);
}

async function logError(publisher, error, context = {}) {
  const sanitizedContext = Sanitizer.sanitizeObject({ ...context, message: error.message });
  // eslint-disable-next-line no-console
  console.error(`❌ ${context.store ?? 'gatekeeper'}: ${error.message}`);

  if (publisher?.reportError) {
    await publisher.reportError(error, sanitizedContext);
  }
}

async function loadConfiguration(configPath) {
  const config = await loadJSONFile(configPath, 'Configuration');
  return ConfigValidator.validate(config);
}

export async function createCLI() {
  const program = new Command();

  program
    .name('gatekeeper')
    .description('Centralized browser extension publishing for Little Bear Apps')
    .version('0.1.0');

  program
    .command('publish')
    .requiredOption('--manifest <path>', 'Path to manifest.json')
    .option('--stores <stores>', 'Comma-separated stores (chrome,firefox)', 'chrome')
    .option('--config <path>', 'Path to config file', DEFAULT_CONFIG_PATH)
    .option('--target <target>', 'Chrome publish target (default|trustedTesters)')
    .option('--percentage-rollout <value>', 'Chrome staged rollout percentage', (value) => Number.parseFloat(value))
    .option('--channel <channel>', 'Firefox channel (listed|unlisted)', 'listed')
    .action(async (options) => {
      const manifestPath = path.resolve(process.cwd(), options.manifest);
      let manifest;

      try {
        manifest = await loadJSONFile(manifestPath, 'Manifest');
      } catch (error) {
        await logError(null, error, { store: 'manifest', stage: 'load' });
        process.exitCode = 1;
        return;
      }

      let config;
      try {
        config = await loadConfiguration(options.config);
      } catch (error) {
        await logError(null, error, { store: 'config', stage: 'load' });
        process.exitCode = 1;
        return;
      }

      const manifestDir = path.dirname(manifestPath);
      const stores = parseStores(options.stores, config.browsers ?? []);

      if (stores.length === 0) {
        await logError(null, new ValidationError('No stores specified for publish command'), {
          store: 'gatekeeper',
          stage: 'arguments'
        });
        process.exitCode = 1;
        return;
      }

      for (const store of stores) {
        let publisher;
        try {
          publisher = createPublisherInstance(store, config);
        } catch (error) {
          await logError(publisher, error, { store, stage: 'initialize' });
          process.exitCode = 1;
          continue;
        }

        logInfo(`🚀 Publishing to ${store}...`);

        try {
          await validateForStore(publisher, manifest, manifestDir);
          logInfo(`✅ ${store}: manifest validated`);
        } catch (error) {
          await logError(publisher, error, { store, stage: 'validate' });
          process.exitCode = 1;
          continue;
        }

        let artifact;
        try {
          artifact = await packageForStore(publisher, manifestDir);
          logInfo(`📦 ${store}: packaged artifact at ${artifact}`);
        } catch (error) {
          await logError(publisher, error, { store, stage: 'package' });
          process.exitCode = 1;
          continue;
        }

        let uploadId;
        try {
          uploadId = await uploadForStore(publisher, artifact);
          logInfo(`⬆️  ${store}: uploaded artifact (${uploadId})`);
        } catch (error) {
          await logError(publisher, error, { store, stage: 'upload' });
          process.exitCode = 1;
          continue;
        }

        try {
          const publishResult = await publishForStore(store, publisher, uploadId, manifestDir, options);
          const publishUrl = publishResult?.url ? ` → ${publishResult.url}` : '';
          logInfo(`🎉 ${store}: publish completed${publishUrl}`);
        } catch (error) {
          await logError(publisher, error, { store, stage: 'publish' });
          process.exitCode = 1;
        }
      }
    });

  program
    .command('validate')
    .requiredOption('--manifest <path>', 'Path to manifest.json')
    .option('--stores <stores>', 'Comma-separated stores (chrome,firefox)')
    .option('--config <path>', 'Path to config file', DEFAULT_CONFIG_PATH)
    .action(async (options) => {
      const manifestPath = path.resolve(process.cwd(), options.manifest);
      let manifest;

      try {
        manifest = await loadJSONFile(manifestPath, 'Manifest');
      } catch (error) {
        await logError(null, error, { store: 'manifest', stage: 'load' });
        process.exitCode = 1;
        return;
      }

      let config;
      try {
        config = await loadConfiguration(options.config);
      } catch (error) {
        await logError(null, error, { store: 'config', stage: 'load' });
        process.exitCode = 1;
        return;
      }

      const manifestDir = path.dirname(manifestPath);
      const stores = parseStores(options.stores, config.browsers ?? []);

      if (stores.length === 0) {
        await logError(null, new ValidationError('No stores specified for validate command'), {
          store: 'gatekeeper',
          stage: 'arguments'
        });
        process.exitCode = 1;
        return;
      }

      for (const store of stores) {
        let publisher;

        try {
          publisher = createPublisherInstance(store, config);
        } catch (error) {
          await logError(publisher, error, { store, stage: 'initialize' });
          process.exitCode = 1;
          continue;
        }

        try {
          await validateForStore(publisher, manifest, manifestDir);
          logInfo(`✅ ${store}: manifest validation succeeded`);
        } catch (error) {
          await logError(publisher, error, { store, stage: 'validate' });
          process.exitCode = 1;
        }
      }
    });

  program
    .command('cancel')
    .requiredOption('--store <store>', 'Store to cancel (chrome,firefox)')
    .requiredOption('--upload-id <id>', 'Upload identifier returned from publish')
    .option('--config <path>', 'Path to config file', DEFAULT_CONFIG_PATH)
    .action(async (options) => {
      const store = options.store.trim().toLowerCase();
      let config;

      try {
        config = await loadConfiguration(options.config);
      } catch (error) {
        await logError(null, error, { store: 'config', stage: 'load' });
        process.exitCode = 1;
        return;
      }

      let publisher;
      try {
        publisher = createPublisherInstance(store, config);
      } catch (error) {
        await logError(publisher, error, { store, stage: 'initialize' });
        process.exitCode = 1;
        return;
      }

      try {
        const cancelResult = await publisher.cancel(options.uploadId, config.credentials?.[store]);
        if (cancelResult) {
          logInfo(`🛑 ${store}: cancel result ${JSON.stringify(cancelResult)}`);
        } else {
          logInfo(`🛑 ${store}: cancel operation completed`);
        }
      } catch (error) {
        await logError(publisher, error, { store, stage: 'cancel' });
        process.exitCode = 1;
      }
    });

  return program;
}

async function run() {
  try {
    const cli = await createCLI();
    await cli.parseAsync(process.argv);
  } catch (error) {
    if (error instanceof APIError || error instanceof ValidationError) {
      // eslint-disable-next-line no-console
      console.error(`❌ gatekeeper: ${error.message}`);
    } else {
      // eslint-disable-next-line no-console
      console.error('❌ gatekeeper: unexpected error', error);
    }

    process.exitCode = 1;
  }
}

const invokedAsScript = process.argv[1]
  ? import.meta.url === new URL(process.argv[1], 'file://').href
  : false;

if (invokedAsScript) {
  run();
}
