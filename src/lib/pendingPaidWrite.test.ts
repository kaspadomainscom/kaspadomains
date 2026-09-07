import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  clearPendingListing,
  findPendingListing,
  loadPendingListing,
  savePendingListing,
} = require('./pendingPaidWrite.ts') as typeof import('./pendingPaidWrite');

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

test('a paid listing can be recovered after signing fails without paying again', () => {
  const storage = new MemoryStorage();
  const pending = {
    domain: 'Example.kas',
    categories: ['tech', 'community'],
    intent: 'intent-token',
    paymentTxId: 'a'.repeat(64),
  };

  savePendingListing(storage, pending);

  assert.deepEqual(loadPendingListing(storage, 'example.kas', pending.categories), pending);
  assert.deepEqual(
    loadPendingListing(storage, 'example.kas', ['community', 'tech']),
    pending,
  );

  clearPendingListing(storage, 'example.kas');
  assert.equal(loadPendingListing(storage, 'example.kas', pending.categories), null);
});

test('a pending payment is not reused for different categories', () => {
  const storage = new MemoryStorage();
  savePendingListing(storage, {
    domain: 'example.kas',
    categories: ['tech'],
    intent: 'intent-token',
    paymentTxId: 'b'.repeat(64),
  });

  assert.equal(loadPendingListing(storage, 'example.kas', ['community']), null);
  assert.deepEqual(findPendingListing(storage, 'EXAMPLE.KAS')?.categories, ['tech']);
});
