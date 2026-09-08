import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { activeCategoryDomains, activeCategoryCount } = require('./categoryDomains.ts') as {
  activeCategoryDomains: <T extends { isActive: boolean }>(domains: readonly T[]) => T[];
  activeCategoryCount: (domains: readonly { isActive: boolean }[]) => number;
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

// Defect caught: the category index counted withdrawn memberships while detail
// pages rendered only active listings, so the same category showed conflicting totals.
test('category counts exclude withdrawn memberships', () => {
  assert.equal(
    activeCategoryCount([
      { isActive: true },
      { isActive: false },
      { isActive: true },
    ]),
    2
  );
});
