import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const paymentCheck = require('./paymentCheck.ts') as {
  checkPayment: (input: {
    tx: Tx;
    treasury: string;
    requiredSompi: bigint;
    payerAddress: string;
  }) => { ok: boolean; reason?: string; paidSompi: bigint };
};

type Tx = {
  is_accepted?: boolean;
  inputs?: { previous_outpoint_address?: string | null }[];
  outputs?: { amount?: number | string; script_public_key_address?: string }[];
};

const { checkPayment } = paymentCheck;

const TREASURY = 'kaspa:qtreasury';
const SIGNER = 'kaspa:qsigner';
const FEE = BigInt(20_000_000_000); // 200 KAS in sompi

function tx(over: Partial<Tx> = {}): Tx {
  return {
    is_accepted: true,
    inputs: [{ previous_outpoint_address: SIGNER }],
    outputs: [{ amount: FEE.toString(), script_public_key_address: TREASURY }],
    ...over,
  };
}

const check = (t: Tx, payer = SIGNER) =>
  checkPayment({ tx: t, treasury: TREASURY, requiredSompi: FEE, payerAddress: payer });

test('accepts a transaction that pays the fee from the signer', () => {
  const verdict = check(tx());
  assert.equal(verdict.ok, true);
  assert.equal(verdict.paidSompi, FEE);
});

test('refuses a payment that did not come from the signer', () => {
  // SA-02, the bug this check exists for. Kaspa transactions are public, so
  // without it anyone could lift a fresh txid off the ledger and spend it as
  // their own -- and because receipts are single-use, that consumes the
  // victim's payment rather than merely freeloading.
  const verdict = check(tx({ inputs: [{ previous_outpoint_address: 'kaspa:qstranger' }] }));
  assert.equal(verdict.ok, false);
  assert.equal(verdict.reason, 'wrong-payer');
});

test('refuses when the payer cannot be determined at all', () => {
  // Must fail, not skip. An unresolvable payer is exactly the case an attacker
  // wants, so "we could not check" has to mean "no".
  for (const inputs of [undefined, [], [{ previous_outpoint_address: null }], [{}]]) {
    const verdict = check(tx({ inputs: inputs as Tx['inputs'] }));
    assert.equal(verdict.ok, false);
    assert.equal(verdict.reason, 'payer-unknown');
  }
});

test('refuses a transaction the network has not accepted', () => {
  for (const accepted of [false, undefined]) {
    const verdict = check(tx({ is_accepted: accepted }));
    assert.equal(verdict.ok, false);
    assert.equal(verdict.reason, 'not-accepted');
  }
});

test('ignores outputs to any address other than the treasury', () => {
  // Paying a lookalike address is not paying us. The change output back to the
  // payer is the everyday case.
  const verdict = check(
    tx({
      outputs: [
        { amount: FEE.toString(), script_public_key_address: 'kaspa:qlookalike' },
        { amount: '1', script_public_key_address: TREASURY },
      ],
    })
  );
  assert.equal(verdict.ok, false);
  assert.equal(verdict.reason, 'underpaid');
  assert.equal(verdict.paidSompi, BigInt(1));
});

test('sums multiple outputs to the treasury', () => {
  const half = FEE / BigInt(2);
  const verdict = check(
    tx({
      outputs: [
        { amount: half.toString(), script_public_key_address: TREASURY },
        { amount: half.toString(), script_public_key_address: TREASURY },
      ],
    })
  );
  assert.equal(verdict.ok, true);
});

test('accepts overpayment rather than refusing it', () => {
  // Refusing would mean taking someone's money and giving nothing back.
  const verdict = check(
    tx({ outputs: [{ amount: (FEE * BigInt(3)).toString(), script_public_key_address: TREASURY }] })
  );
  assert.equal(verdict.ok, true);
  assert.equal(verdict.paidSompi, FEE * BigInt(3));
});

test('refuses one sompi short', () => {
  const verdict = check(
    tx({ outputs: [{ amount: (FEE - BigInt(1)).toString(), script_public_key_address: TREASURY }] })
  );
  assert.equal(verdict.ok, false);
  assert.equal(verdict.reason, 'underpaid');
});

test('a malformed amount lowers the total rather than raising it', () => {
  // The failure direction matters: skipping an unparseable amount can only ever
  // make the payment look smaller, so a hostile value refuses rather than
  // accepts.
  const verdict = check(
    tx({
      outputs: [
        { amount: 'not-a-number', script_public_key_address: TREASURY },
        { amount: FEE.toString(), script_public_key_address: TREASURY },
      ],
    })
  );
  assert.equal(verdict.ok, true);
  assert.equal(verdict.paidSompi, FEE, 'the bad output contributes nothing');

  const hostile = check(
    tx({ outputs: [{ amount: 'not-a-number', script_public_key_address: TREASURY }] })
  );
  assert.equal(hostile.ok, false);
});

test('matches the payer address case-insensitively and ignores surrounding space', () => {
  const verdict = check(
    tx({ inputs: [{ previous_outpoint_address: `  ${SIGNER.toUpperCase()}  ` }] })
  );
  assert.equal(verdict.ok, true);
});

test('accepts when any one of several inputs belongs to the signer', () => {
  // A wallet may pull from more than one UTXO, so the rule is "any", not "all".
  const verdict = check(
    tx({
      inputs: [
        { previous_outpoint_address: 'kaspa:qsomeoneelse' },
        { previous_outpoint_address: SIGNER },
      ],
    })
  );
  assert.equal(verdict.ok, true);
});

test('an empty transaction is refused, not treated as paid', () => {
  const verdict = check({});
  assert.equal(verdict.ok, false);
});
