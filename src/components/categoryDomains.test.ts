import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { activeCategoryDomains } = require('./categoryDomains.ts') as {
  activeCategoryDomains: <T extends { isActive: boolean }>(domains: readonly T[]) => T[];
};

test('category grids exclude inactive memberships', () => {
  const domains = [
    { name: 'live.kas', isActive: true },
    { name: 'withdrawn.kas', isActive: false },
  ];

  assert.deepEqual(activeCategoryDomains(domains), [domains[0]]);
});

test('an all-inactive category produces no cards', () => {
  assert.deepEqual(
    activeCategoryDomains([{ name: 'withdrawn.kas', isActive: false }]),
    []
  );
});
