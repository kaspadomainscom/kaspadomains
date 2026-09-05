// src/lib/server/verifyPayment.ts
import { TREASURY_ADDRESS, isFeeCollectionConfigured, formatKas } from '../fees';
import { VerificationError } from './verifyRequest';

/**
 * Confirm that a Kaspa L1 transaction actually paid the fee.
 *
 * The client asks Kasware to send the fee and hands us the resulting txid. We
 * never trust that it paid anything -- the transaction is fetched from the
 * Kaspa API and inspected here.
 *
 * ## Rules, and why each exists
 *
 * - **The transaction must be accepted.** An unconfirmed or rejected txid is
 *   not payment.
 * - **Outputs to the treasury must total at least the required amount.** Only
 *   outputs whose address is the treasury count; the change output back to the
 *   payer obviously does not. Overpayment is accepted rather than rejected --
 *   refusing it would mean taking someone's money and giving nothing back.
 * - **A txid is single-use.** Enforced by a unique constraint in the database
 *   rather than here, because only the database can make that atomic; two
 *   concurrent requests quoting the same payment would both pass this check.
 *   See the callers.
 * - **A missing treasury address disables paid actions entirely.** It must
 *   never silently fall through to "free" -- that would hand out listings for
 *   nothing the moment an env var went missing.
 */

type KaspaTransaction = {
  transaction_id?: string;
  is_accepted?: boolean;
  inputs?: {
    previous_outpoint_address?: string | null;
  }[];
  outputs?: {
    amount?: number | string;
    script_public_key_address?: string;
  }[];
};

export type VerifiedPayment = {
  txId: string;
  paidSompi: bigint;
};

const TX_ID_PATTERN = /^[0-9a-fA-F]{64}$/;

export async function verifyPayment(input: {
  txId: string;
  requiredSompi: bigint;
  /**
   * The verified signer's `kaspa:` address. The payment must come *from* them.
   *
   * Without this the receipt is a bearer coupon: Kaspa transactions are public,
   * so anyone watching the treasury address could take a stranger's txid and
   * spend it on their own listing. Because a receipt is single-use, that is not
   * merely freeloading -- it consumes the victim's payment and leaves them
   * holding an error and a 200 KAS hole.
   */
  payerAddress: string;
}): Promise<VerifiedPayment> {
  if (!isFeeCollectionConfigured) {
    throw new VerificationError(
      'Payments are not configured on this deployment, so this action is unavailable.',
      503
    );
  }

  const txId = input.txId?.trim() ?? '';
  if (!TX_ID_PATTERN.test(txId)) {
    throw new VerificationError('A valid payment transaction id is required.', 400);
  }

  let response: Response;
  try {
    // "light" resolves each input's previous outpoint address, which is what
    // lets us check who actually paid.
    response = await fetch(
      `https://api.kaspa.org/transactions/${txId}?resolve_previous_outpoints=light`,
      { headers: { accept: 'application/json' } }
    );
  } catch (error) {
    // Treat an unreachable API as "cannot confirm", never as "confirmed".
    throw new VerificationError(
      `Could not reach the Kaspa API to confirm payment: ${(error as Error).message}`,
      503
    );
  }

  if (response.status === 404) {
    throw new VerificationError(
      'That payment transaction could not be found yet. Wait a few seconds and try again.',
      404
    );
  }
  if (!response.ok) {
    throw new VerificationError(
      `The Kaspa API returned ${response.status} while confirming payment.`,
      503
    );
  }

  const tx = (await response.json()) as KaspaTransaction;

  if (tx.is_accepted !== true) {
    throw new VerificationError(
      'That payment has not been accepted by the network yet. Wait for confirmation and try again.',
      409
    );
  }

  // Who paid? At least one input must be funded by the signer's own address.
  // Kaspa transactions can have several inputs, and a wallet may pull from more
  // than one UTXO, so this is "any input belongs to them" rather than "all".
  const payer = input.payerAddress.trim().toLowerCase();
  const inputAddresses = (tx.inputs ?? [])
    .map((i) => (i.previous_outpoint_address ?? '').trim().toLowerCase())
    .filter(Boolean);

  if (inputAddresses.length === 0) {
    // The API could not resolve the payer. Refuse rather than skip the check --
    // an unresolvable payer is exactly the case an attacker would want.
    throw new VerificationError(
      'Could not determine who paid that transaction; try again shortly.',
      503
    );
  }

  if (!inputAddresses.includes(payer)) {
    throw new VerificationError(
      'That payment was not sent from your wallet. Pay the fee from the address that owns the domain.',
      403
    );
  }

  let paidSompi = BigInt(0);
  for (const output of tx.outputs ?? []) {
    if (output.script_public_key_address !== TREASURY_ADDRESS) continue;
    try {
      paidSompi += BigInt(output.amount ?? 0);
    } catch {
      // A malformed amount is not payment.
    }
  }

  if (paidSompi < input.requiredSompi) {
    throw new VerificationError(
      `That transaction paid ${formatKas(paidSompi)} to the fee address, but ${formatKas(
        input.requiredSompi
      )} is required.`,
      402
    );
  }

  return { txId, paidSompi };
}
