/**
 * Deciding whether a Kaspa transaction actually paid a fee.
 *
 * ## Why this is separate from `server/verifyPayment.ts`
 *
 * That module fetches from the Kaspa API and throws HTTP-shaped errors, and it
 * imports through relative paths the test runner cannot resolve — so the
 * decision itself, which is pure and is the part that matters, could not be
 * covered. Here it takes a transaction and returns a verdict; the caller does
 * the fetching and the error mapping.
 *
 * ## What it is defending against
 *
 * Two things, both of which were real:
 *
 * 1. **A receipt is not a bearer coupon.** Checking only that the treasury was
 *    paid enough let anyone lift a fresh txid off the public ledger and spend it
 *    as their own. Because receipts are single-use, that is not freeloading — it
 *    consumes the victim's payment and leaves them with an error and a 200 KAS
 *    hole. So the payment must come *from* the signer.
 * 2. **An unresolvable payer must fail, not pass.** If the API cannot say who
 *    paid, that is exactly the case an attacker wants, so it is refused rather
 *    than skipped.
 */

export type PaymentTransaction = {
  is_accepted?: boolean;
  inputs?: { previous_outpoint_address?: string | null }[];
  outputs?: { amount?: number | string; script_public_key_address?: string }[];
};

export type PaymentVerdict =
  | { ok: true; paidSompi: bigint }
  | { ok: false; reason: 'not-accepted' | 'payer-unknown' | 'wrong-payer' | 'underpaid'; paidSompi: bigint };

/**
 * Does this transaction pay `requiredSompi` to `treasury`, from `payerAddress`?
 *
 * Overpayment is accepted rather than rejected — refusing it would mean taking
 * someone's money and giving nothing back.
 */
export function checkPayment(input: {
  tx: PaymentTransaction;
  treasury: string;
  requiredSompi: bigint;
  payerAddress: string;
}): PaymentVerdict {
  const { tx, treasury, requiredSompi } = input;

  if (tx.is_accepted !== true) {
    return { ok: false, reason: 'not-accepted', paidSompi: BigInt(0) };
  }

  // Kaspa transactions can have several inputs and a wallet may pull from more
  // than one UTXO, so this is "any input belongs to them", not "all".
  const payer = input.payerAddress.trim().toLowerCase();
  const inputAddresses = (tx.inputs ?? [])
    .map((i) => (i.previous_outpoint_address ?? '').trim().toLowerCase())
    .filter(Boolean);

  if (inputAddresses.length === 0) {
    return { ok: false, reason: 'payer-unknown', paidSompi: BigInt(0) };
  }
  if (!inputAddresses.includes(payer)) {
    return { ok: false, reason: 'wrong-payer', paidSompi: BigInt(0) };
  }

  let paidSompi = BigInt(0);
  for (const output of tx.outputs ?? []) {
    // Only outputs to the treasury count. The change output back to the payer
    // obviously does not, and neither does a payment to a lookalike address.
    if (output.script_public_key_address !== treasury) continue;
    try {
      paidSompi += BigInt(output.amount ?? 0);
    } catch {
      // A malformed amount is not payment. Skipping it can only ever lower the
      // total, so the failure direction is "refuse", never "accept".
    }
  }

  if (paidSompi < requiredSompi) {
    return { ok: false, reason: 'underpaid', paidSompi };
  }

  return { ok: true, paidSompi };
}
