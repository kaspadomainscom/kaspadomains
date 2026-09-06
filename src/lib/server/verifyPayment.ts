// src/lib/server/verifyPayment.ts
import { TREASURY_ADDRESS, isFeeCollectionConfigured, formatKas } from '../fees';
import { kaspaTransactionUrl } from '../kaspaDomainRuntime';
import { VerificationError } from './verificationError';
import { checkPayment, type PaymentTransaction } from '../paymentCheck';

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
    const transactionUrl = kaspaTransactionUrl(txId);
    transactionUrl.searchParams.set('resolve_previous_outpoints', 'light');
    response = await fetch(transactionUrl, { headers: { accept: 'application/json' } });
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

  const tx = (await response.json()) as PaymentTransaction;

  // The decision itself lives in `@/lib/paymentCheck`, which imports nothing, so
  // it can be tested. This function owns the fetching and the HTTP mapping; that
  // one owns "did this transaction actually pay us, from the right wallet".
  const verdict = checkPayment({
    tx,
    treasury: TREASURY_ADDRESS,
    requiredSompi: input.requiredSompi,
    payerAddress: input.payerAddress,
  });

  if (!verdict.ok) {
    switch (verdict.reason) {
      case 'not-accepted':
        throw new VerificationError(
          'That payment has not been accepted by the network yet. Wait for confirmation and try again.',
          409
        );
      case 'payer-unknown':
        // Refuse rather than skip the check -- an unresolvable payer is exactly
        // the case an attacker would want.
        throw new VerificationError(
          'Could not determine who paid that transaction; try again shortly.',
          503
        );
      case 'wrong-payer':
        throw new VerificationError(
          'That payment was not sent from your wallet. Pay the fee from the address that owns the domain.',
          403
        );
      case 'underpaid':
        throw new VerificationError(
          `That transaction paid ${formatKas(verdict.paidSompi)} to the fee address, but ${formatKas(
            input.requiredSompi
          )} is required.`,
          402
        );
    }
  }

  const paidSompi = verdict.paidSompi;

  return { txId, paidSompi };
}
