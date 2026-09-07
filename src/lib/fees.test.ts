import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const feeDisplay = require('./feeDisplay.ts') as {
  SOMPI_PER_KAS: bigint;
  formatKas: (sompi: bigint) => string;
};

test('formats the active listing and vote amounts without unit drift', () => {
  assert.equal(feeDisplay.formatKas(BigInt(200) * feeDisplay.SOMPI_PER_KAS), '200 KAS');
  assert.equal(feeDisplay.formatKas(BigInt(1) * feeDisplay.SOMPI_PER_KAS), '1 KAS');
});

test('formats fractional sompi amounts without floating-point rounding', () => {
  assert.equal(feeDisplay.formatKas(BigInt(123_456_789)), '1.23456789 KAS');
  assert.equal(feeDisplay.formatKas(BigInt(100_000_001)), '1.00000001 KAS');
});
