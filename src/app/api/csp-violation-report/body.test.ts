import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { readLimitedBody } = require('./body.ts') as typeof import('./body');

test('stops consuming a chunked CSP report once the byte limit is exceeded', async () => {
  // This catches the production bug where req.text() buffered an unbounded
  // unauthenticated body before the endpoint checked its size.
  const request = new Request('https://example.test/api/csp-violation-report', {
    method: 'POST',
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('a'.repeat(9000)));
        controller.close();
      },
    }),
    duplex: 'half',
  } as RequestInit & { duplex: 'half' });

  const result = await readLimitedBody(request, 8192);
  assert.equal(result, null);
});
