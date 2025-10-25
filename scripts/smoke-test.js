#!/usr/bin/env node

import process from 'node:process';

import { ChromePublisher } from '../src/publishers/chrome.js';
import { ConfigValidator } from '../src/core/config.js';
import { ValidationError } from '../src/core/errors.js';

async function run() {
  // eslint-disable-next-line no-console
  console.log('🧪 Running Gatekeeper smoke tests...\n');

  // Test 1: Config validation should fail for invalid inputs
  // eslint-disable-next-line no-console
  console.log('1. Testing config validation...');
  try {
    ConfigValidator.validate({
      githubToken: 'invalid',
      repo: 'test/repo',
      browsers: [],
      credentials: {}
    });
    // eslint-disable-next-line no-console
    console.log('❌ Config validation should have thrown ValidationError');
    process.exitCode = 1;
  } catch (error) {
    if (error instanceof ValidationError) {
      // eslint-disable-next-line no-console
      console.log('✅ Config validation rejected invalid input');
    } else {
      // eslint-disable-next-line no-console
      console.log(`❌ Unexpected error type: ${error}`);
      process.exitCode = 1;
    }
  }

  // Test 2: Publisher instantiation should succeed with minimal config
  // eslint-disable-next-line no-console
  console.log('\n2. Testing publisher creation...');
  try {
    const config = {
      githubToken: 'ghp_testtoken',
      repo: 'owner/repo',
      browsers: ['chrome'],
      credentials: {
        chrome: {
          publisherId: 'test-publisher',
          itemId: 'test-item-id',
          wifConfig: {}
        }
      }
    };

    const publisher = new ChromePublisher(config);
    if (publisher) {
      // eslint-disable-next-line no-console
      console.log('✅ Chrome publisher created successfully');
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(`❌ Failed to create Chrome publisher: ${error.message}`);
    process.exitCode = 1;
  }

  if (process.exitCode === undefined || process.exitCode === 0) {
    // eslint-disable-next-line no-console
    console.log('\n✅ All smoke tests passed!');
  } else {
    // eslint-disable-next-line no-console
    console.log('\n⚠️ Smoke tests completed with issues');
  }
}

run();
