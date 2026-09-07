import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const storeError = require('./storeError.ts') as {
  classifyStoreError: (e: { code?: string | null; message?: string | null } | null | undefined) => string;
  storeFailureStatus: (f: string) => number;
  isStoreFailureRetryable: (f: string) => boolean;
};

const { classifyStoreError, storeFailureStatus, isStoreFailureRetryable } = storeError;

test('recognises every code that means the schema is not applied', () => {
  // These were the five in each of the three hand-written copies. If a code is
  // dropped here, a project mid-migration starts reporting 500s that send
  // someone looking for a bug in the application.
  for (const code of ['PGRST202', 'PGRST204', 'PGRST205', '42P01', '42703']) {
    assert.equal(classifyStoreError({ code }), 'setup-incomplete', code);
    assert.equal(storeFailureStatus(classifyStoreError({ code })), 503, code);
  }
});

test('a database we could not reach is not an internal server error', () => {
  // The gap all three copies shared. A transport failure carries none of the
  // setup codes, so it fell through to 500 -- a claim that the bug is in our
  // code, which is both wrong and the wrong signal to a crawler.
  const transport = [
    { message: 'TypeError: fetch failed' },
    { message: 'fetch failed' },
    { code: '', message: 'FetchError: request to https://x.supabase.co failed' },
    { message: 'connect ECONNREFUSED 127.0.0.1:443' },
    { message: 'getaddrinfo ENOTFOUND x.supabase.co' },
    { message: 'socket hang up' },
    { message: 'Request timeout' },
  ];
  for (const error of transport) {
    const kind = classifyStoreError(error);
    assert.equal(kind, 'unreachable', JSON.stringify(error));
    assert.equal(storeFailureStatus(kind), 503);
    assert.equal(isStoreFailureRetryable(kind), true);
  }
});

test('an error with no code at all is treated as unreachable', () => {
  // PostgREST sets a code on every error it returns, so its absence means the
  // failure happened before there was a response to carry one.
  assert.equal(classifyStoreError({ message: 'something odd' }), 'unreachable');
  assert.equal(classifyStoreError({ code: '', message: '' }), 'unreachable');
  assert.equal(classifyStoreError({ code: '   ' }), 'unreachable');
});

test('a real database error we did not anticipate stays a 500', () => {
  // The one case where "something is wrong with us and we do not know what" is
  // the honest answer. Collapsing these into 503 would hide real bugs behind a
  // status that says "try again later".
  for (const code of ['23505', '23503', '22P02', 'PGRST116', 'KD001']) {
    const kind = classifyStoreError({ code, message: 'nope' });
    assert.equal(kind, 'unexpected', code);
    assert.equal(storeFailureStatus(kind), 500, code);
    assert.equal(isStoreFailureRetryable(kind), false, code);
  }
});

test('a missing error object does not become a confident answer', () => {
  for (const nothing of [null, undefined]) {
    assert.equal(classifyStoreError(nothing), 'unexpected', String(nothing));
  }
});

test('setup problems are not retried, because retrying cannot fix them', () => {
  // Distinct from "unreachable" on purpose: waiting helps one and not the other,
  // and a client that retries a missing table just hammers the endpoint.
  assert.equal(isStoreFailureRetryable('setup-incomplete'), false);
  assert.equal(isStoreFailureRetryable('unreachable'), true);
  assert.equal(isStoreFailureRetryable('unexpected'), false);
});

test('matches transport hints case-insensitively', () => {
  assert.equal(classifyStoreError({ message: 'TypeError: Fetch Failed' }), 'unreachable');
  assert.equal(classifyStoreError({ message: 'ECONNRESET' }), 'unreachable');
});

test('a setup code wins over a message that looks like a timeout', () => {
  // Order matters: PostgREST answered, so this is not a transport failure no
  // matter what the text says.
  assert.equal(
    classifyStoreError({ code: 'PGRST205', message: 'timeout while loading schema cache' }),
    'setup-incomplete'
  );
});
