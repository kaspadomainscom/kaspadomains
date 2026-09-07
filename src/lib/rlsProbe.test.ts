import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { runRlsProbe } = require('./rlsProbe.ts') as typeof import('./rlsProbe');

test('an open RLS policy is detected without leaving a probe row', async () => {
  // Defect this catches: the status route used to insert a real
  // status-probe-*.invalid domain and never remove it when RLS was open.
  const persisted: Record<string, unknown>[] = [];
  const outcome = await runRlsProbe(async (payload) => {
    if (payload.domain_hash === null || payload.name === null || payload.owner === null) {
      return { error: { code: '23502', message: 'null value violates not-null constraint' } };
    }
    persisted.push(payload);
    return { error: null };
  });

  assert.equal(outcome.kind, 'open');
  assert.equal(persisted.length, 0);
});

test('an RLS refusal remains a passing probe', async () => {
  const outcome = await runRlsProbe(async () => ({ error: { code: '42501', message: 'new row violates row-level security policy' } }));
  assert.equal(outcome.kind, 'blocked');
});

test('a transport rejection remains inconclusive', async () => {
  const outcome = await runRlsProbe(async () => {
    throw new Error('fetch failed');
  });
  assert.equal(outcome.kind, 'unknown');
});
