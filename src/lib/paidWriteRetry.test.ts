import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const mod = require('./paidWriteRetry.ts') as {
  RETRY_DEADLINE_MS: number;
  retryDelayMs: (attempt: number) => number;
  decidePaidWrite: (input: {
    attemptResult: Attempt;
    attempt: number;
    elapsedMs: number;
    fallbackMessage: string;
  }) => { kind: string; afterMs?: number; message?: string };
};

type Attempt =
  | { transport: 'failed' }
  | {
      transport: 'ok';
      ok: boolean;
      status: number;
      body: { error?: string; retryable?: boolean; code?: string };
    };

const { decidePaidWrite, retryDelayMs, RETRY_DEADLINE_MS } = mod;

const FALLBACK = 'Could not create the listing.';
const decide = (attemptResult: Attempt, attempt = 1, elapsedMs = 0) =>
  decidePaidWrite({ attemptResult, attempt, elapsedMs, fallbackMessage: FALLBACK });

const answer = (
  status: number,
  body: { error?: string; retryable?: boolean; code?: string }
): Attempt => ({ transport: 'ok', ok: false, status, body });

test('a successful write is success', () => {
  assert.equal(decide({ transport: 'ok', ok: true, status: 201, body: {} }).kind, 'success');
});

test('retries the failures the payment race actually produces', () => {
  // Each of these is what a correctly paid listing looks like when the write
  // outruns the indexer. Treating any of them as final is the double-charge.
  for (const status of [404, 425, 503]) {
    const verdict = decide(answer(status, { error: 'not yet', retryable: true }));
    assert.equal(verdict.kind, 'retry', `status ${status} must be retried`);
    assert.ok((verdict.afterMs ?? 0) > 0);
  }
});

test('does not retry a failure the server did not mark retryable', () => {
  // The important one is 409 without the flag: an expired intent. It shares a
  // status with "not accepted yet" and is the opposite advice, which is why the
  // decision reads the flag and never the status.
  for (const status of [400, 402, 403, 409, 500]) {
    const verdict = decide(answer(status, { error: 'no' }));
    assert.equal(verdict.kind, 'failed', `status ${status} must not be retried`);
    assert.equal(verdict.message, 'no');
  }
});

test('a dropped connection is retried, not reported as failure', () => {
  // The response can be lost after the server committed, so giving up here
  // would tell someone their listing failed when it exists.
  assert.equal(decide({ transport: 'failed' }).kind, 'retry');
});

test('a consumed receipt on a retry means our own earlier attempt landed', () => {
  // A receipt is bound to the payer, so only our request could have spent our
  // transaction. If it is spent by the time we retry, we spent it.
  for (const code of ['KD001', 'KD002', 'KD004']) {
    const verdict = decide(answer(409, { error: 'already used', code }), 2);
    assert.equal(verdict.kind, 'already-done', code);
    assert.equal(verdict.message, 'already used');
  }
});

test('the same codes on a first attempt are a real conflict, not success', () => {
  // Nothing of ours has been sent yet, so "already listed" means someone else
  // -- or another tab. Reporting success would be a lie.
  for (const code of ['KD001', 'KD002', 'KD004']) {
    assert.equal(decide(answer(409, { error: 'already listed', code }), 1).kind, 'failed', code);
  }
});

test('an unknown code on a retry is not assumed to be success', () => {
  assert.equal(decide(answer(409, { error: 'nope', code: 'KD007' }), 2).kind, 'failed');
});

test('stops retrying at the deadline instead of sending an expired request', () => {
  const late = decide(answer(404, { retryable: true }), 3, RETRY_DEADLINE_MS - 100);
  assert.equal(late.kind, 'failed');

  const early = decide(answer(404, { retryable: true }), 3, 1_000);
  assert.equal(early.kind, 'retry');
});

test('backoff grows and then stops growing', () => {
  const delays = [1, 2, 3, 4, 5, 6, 7, 8].map(retryDelayMs);
  for (let i = 1; i < delays.length; i += 1) {
    assert.ok(delays[i] >= delays[i - 1], 'must never shrink');
  }
  assert.ok(delays[0] >= 1_000, 'first wait must let the indexer catch up');
  assert.ok(delays[delays.length - 1] <= 8_000, 'must stay responsive');
});

test('every retry fits inside the deadline', () => {
  // Guards the arithmetic: a backoff that outgrew the deadline would make the
  // loop give up on its first retry, silently restoring the original bug.
  let elapsed = 0;
  let attempts = 0;
  for (let attempt = 1; attempt <= 50; attempt += 1) {
    const verdict = decide(answer(404, { retryable: true }), attempt, elapsed);
    if (verdict.kind !== 'retry') break;
    elapsed += verdict.afterMs ?? 0;
    attempts += 1;
  }
  assert.ok(attempts >= 5, `expected several retries, got ${attempts}`);
  assert.ok(elapsed < RETRY_DEADLINE_MS);
});

test('falls back to its own message when the server sends no text', () => {
  assert.equal(decide(answer(500, {})).message, FALLBACK);
});
