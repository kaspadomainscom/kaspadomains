import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { listingStatusAction } = require('./listingStatusAction.ts') as {
  listingStatusAction: (status: { votes: number } | null | undefined) => string;
};

test('keeps unavailable listing status from offering a paid relist action', () => {
  assert.equal(listingStatusAction(undefined), 'unknown');
});

test('preserves confirmed not-listed and listed actions', () => {
  assert.equal(listingStatusAction(null), 'not-listed');
  assert.equal(listingStatusAction({ votes: 0 }), 'listed');
});
