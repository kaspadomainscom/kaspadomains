import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const domainName = require('./domainName.ts') as {
  normalizeDomainName?: (name: string) => string;
  baseDomainName?: (name: string) => string;
};

test('normalizes a domain name at the application boundary', () => {
  // Defect this protects: separate callers applying their own suffix or case
  // rules, causing plausible-but-unmatchable names such as foo.kas.kas.
  assert.equal(domainName.normalizeDomainName?.('  Example.KAS  '), 'example.kas');
  assert.equal(domainName.normalizeDomainName?.('Example'), 'example.kas');
  assert.equal(domainName.normalizeDomainName?.(''), '');
});

test('keeps canonicalization idempotent and owns suffix removal', () => {
  const canonical = domainName.normalizeDomainName?.('Example');

  assert.equal(domainName.normalizeDomainName?.(canonical ?? ''), 'example.kas');
  assert.equal(domainName.baseDomainName?.('  EXAMPLE.KAS '), 'example');
  assert.equal(domainName.baseDomainName?.(''), '');
});
