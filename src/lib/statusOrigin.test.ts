import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { statusOrigin } = require('./statusOrigin.ts') as typeof import('./statusOrigin');

test('never turns an untrusted Host header into a server-side destination', () => {
  assert.equal(statusOrigin('169.254.169.254'), 'https://kaspadomains.com');
  assert.equal(statusOrigin('attacker.example:443'), 'https://kaspadomains.com');
});

test('preserves the known public and local development origins', () => {
  assert.equal(statusOrigin('kaspadomains.com'), 'https://kaspadomains.com');
  assert.equal(statusOrigin('localhost:3000'), 'http://localhost:3000');
  assert.equal(statusOrigin('127.0.0.1:3000'), 'http://127.0.0.1:3000');
});
