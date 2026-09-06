import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const format = require('./format.ts') as {
  formatUtcDate: (ms: number) => string | null;
  formatUtcDateFromSeconds: (s: number) => string | null;
  formatCount: (n: number) => string;
};

const { formatUtcDate, formatUtcDateFromSeconds, formatCount } = format;

test('formats a date the same way regardless of the runtime', () => {
  // 2026-09-07T12:00:00Z
  assert.equal(formatUtcDate(Date.UTC(2026, 8, 7, 12, 0, 0)), '7 Sep 2026');
  assert.equal(formatUtcDate(Date.UTC(2001, 0, 1)), '1 Jan 2001');
  assert.equal(formatUtcDate(Date.UTC(1999, 11, 31)), '31 Dec 1999');
});

test('does not depend on the machine time zone', () => {
  // The whole point: a UTC server and a reader east of it must not disagree
  // about which day a near-midnight timestamp falls on. Formatting from UTC
  // parts makes the answer a property of the input alone.
  const lateUtc = Date.UTC(2026, 8, 7, 23, 30, 0);
  const earlyUtc = Date.UTC(2026, 8, 7, 0, 30, 0);
  assert.equal(formatUtcDate(lateUtc), '7 Sep 2026');
  assert.equal(formatUtcDate(earlyUtc), '7 Sep 2026');

  const original = process.env.TZ;
  try {
    for (const tz of ['UTC', 'Asia/Jerusalem', 'America/Los_Angeles', 'Pacific/Kiritimati']) {
      process.env.TZ = tz;
      assert.equal(formatUtcDate(lateUtc), '7 Sep 2026', `late, TZ=${tz}`);
      assert.equal(formatUtcDate(earlyUtc), '7 Sep 2026', `early, TZ=${tz}`);
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

test('reports an unusable timestamp as unknown rather than guessing', () => {
  // Every one of these used to render as a date. `0` is the dangerous one: it
  // is a missing value that survived as a number, and it formats as 1 Jan 1970
  // -- a confident, wrong answer.
  for (const bad of [0, -1, NaN, Infinity, -Infinity]) {
    assert.equal(formatUtcDate(bad), null, `should be unknown: ${bad}`);
  }
});

test('reads listing timestamps, which are in seconds', () => {
  const seconds = Date.UTC(2026, 8, 7) / 1000;
  assert.equal(formatUtcDateFromSeconds(seconds), '7 Sep 2026');
  // Guards the unit: passing seconds to the millisecond function would land in
  // 1970, so a swap has to be visible.
  assert.notEqual(formatUtcDate(seconds), formatUtcDateFromSeconds(seconds));
  assert.equal(formatUtcDateFromSeconds(0), null);
});

test('groups counts identically everywhere', () => {
  assert.equal(formatCount(0), '0');
  assert.equal(formatCount(7), '7');
  assert.equal(formatCount(999), '999');
  assert.equal(formatCount(1000), '1,000');
  assert.equal(formatCount(12345), '12,345');
  assert.equal(formatCount(1234567), '1,234,567');
  assert.equal(formatCount(-4321), '-4,321');
});

test('never emits a leading or doubled separator', () => {
  // The boundary the hand-rolled grouping gets wrong if the modulo is off:
  // exact multiples of three digits.
  for (const n of [100, 1000, 100000, 1000000]) {
    const out = formatCount(n);
    assert.ok(!out.startsWith(','), `leading separator: ${out}`);
    assert.ok(!out.includes(',,'), `doubled separator: ${out}`);
    assert.equal(out.replace(/,/g, ''), String(n));
  }
});

test('a non-finite count is zero, not "NaN" on the page', () => {
  for (const bad of [NaN, Infinity, -Infinity]) {
    assert.equal(formatCount(bad), '0');
  }
});
