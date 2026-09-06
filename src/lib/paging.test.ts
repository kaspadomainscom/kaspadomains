import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const paging = require('./paging.ts') as {
  PAGE_SIZE: number;
  MAX_ROWS: number;
  fetchAllPages: <T>(
    build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
    label: string
  ) => Promise<T[]>;
};

const { PAGE_SIZE, fetchAllPages } = paging;

/**
 * A server that honours `range` and caps every response at `maxRows` — which is
 * what PostgREST does, and the behaviour that makes an unbounded read silently
 * wrong rather than loudly broken.
 */
function server(totalRows: number, maxRows: number) {
  const rows = Array.from({ length: totalRows }, (_, i) => ({ id: i }));
  let requests = 0;
  return {
    get requests() {
      return requests;
    },
    build: async (from: number, to: number) => {
      requests += 1;
      const width = Math.min(to - from + 1, maxRows);
      return { data: rows.slice(from, from + width), error: null };
    },
  };
}

test('returns every row when the server cap is above the page size', async () => {
  for (const total of [0, 1, PAGE_SIZE - 1, PAGE_SIZE, PAGE_SIZE + 1, 10_000]) {
    const rows = await fetchAllPages(server(total, 1000).build, 'domains');
    assert.equal(rows.length, total, `expected ${total} rows`);
    assert.deepEqual(
      rows.map((r) => (r as { id: number }).id),
      Array.from({ length: total }, (_, i) => i),
      'rows must be contiguous and in order'
    );
  }
});

test('returns every row when the server cap is BELOW the page size', async () => {
  // The defect this protects against, and it is not hypothetical: the first
  // version of this loop advanced by PAGE_SIZE and treated a short page as the
  // end. Against a server capping at 100 it returned 100 of 10,000 rows and
  // reported success. Supabase's max-rows is configurable, so a deployment can
  // put the cap below PAGE_SIZE without anyone touching this code.
  const rows = await fetchAllPages(server(10_000, 100).build, 'domains');
  assert.equal(rows.length, 10_000);
});

test('a short page is not the end of the data', async () => {
  // Directly pins the rule the naive version got wrong.
  const rows = await fetchAllPages(server(PAGE_SIZE + 5, 10).build, 'domains');
  assert.equal(rows.length, PAGE_SIZE + 5);
});

test('an error on a later page rejects rather than returning a partial list', async () => {
  // Returning what was read so far would be indistinguishable from a complete
  // read of a smaller table -- the same "empty means unknown" confusion this
  // codebase keeps paying for.
  let call = 0;
  await assert.rejects(
    () =>
      fetchAllPages(async () => {
        call += 1;
        if (call === 2) return { data: null, error: { message: 'boom' } };
        return { data: Array.from({ length: PAGE_SIZE }, (_, i) => ({ id: i })), error: null };
      }, 'domains'),
    /boom/
  );
});

test('a server that ignores range terminates instead of looping forever', async () => {
  const page = Array.from({ length: PAGE_SIZE }, (_, i) => ({ id: i }));
  await assert.rejects(
    () => fetchAllPages(async () => ({ data: page, error: null }), 'domains'),
    /refusing to page past/
  );
});

test('treats a null data payload as the end, not as a crash', async () => {
  const rows = await fetchAllPages(async () => ({ data: null, error: null }), 'domains');
  assert.deepEqual(rows, []);
});

test('asks for a range no wider than the page size', async () => {
  const widths: number[] = [];
  await fetchAllPages(async (from, to) => {
    widths.push(to - from + 1);
    return { data: [], error: null };
  }, 'domains');
  assert.deepEqual(widths, [PAGE_SIZE]);
});
