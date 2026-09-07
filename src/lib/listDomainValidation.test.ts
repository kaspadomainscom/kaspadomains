import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { isListableDomain } = require('./listDomainValidation.ts') as typeof import('./listDomainValidation');

test('accepts a valid domain when the KNS name uses uppercase or pasted whitespace', () => {
  assert.equal(isListableDomain('  Example.KAS  '), true);
});

test('rejects names without the canonical suffix or minimum length', () => {
  assert.equal(isListableDomain('example'), false);
  assert.equal(isListableDomain('.kas'), false);
});
