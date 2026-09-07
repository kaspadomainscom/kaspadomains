import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { syncDomainOwner } = require('./ownerSync.ts') as typeof import('./ownerSync');

test('syncs the cached owner when KNS ownership has changed', async () => {
  const updates: Array<{ owner: string; submitted_by: string }> = [];
  await syncDomainOwner('kaspa:old', 'kaspa:new', 'kaspa:new', async (patch) => {
    updates.push(patch);
  });

  assert.deepEqual(updates, [{ owner: 'kaspa:new', submitted_by: 'kaspa:new' }]);
});

test('does not issue an owner update when the cache is current', async () => {
  let called = false;
  await syncDomainOwner('kaspa:same', 'kaspa:same', 'kaspa:same', async () => {
    called = true;
  });

  assert.equal(called, false);
});
