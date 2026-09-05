// src/lib/server/claimReceipt.ts
import type { TypedSupabaseClient } from '../supabase';
import { VerificationError } from './verifyRequest';
import type { VerifiedPayment } from './verifyPayment';

/**
 * Claim a payment receipt so it can fund exactly one action, ever.
 *
 * The per-table `payment_tx_id` uniques are not sufficient on their own: they
 * are separate constraints, so a 200 KAS listing receipt also clears the 1 KAS
 * vote threshold and could be spent again in `votes`. `payment_receipts` is the
 * single global ledger, and its primary key is what actually enforces
 * one-receipt-one-action across every route.
 *
 * The claim happens *before* the action is written, and is released if that
 * write fails -- see `releaseReceipt`. Doing it the other way round would let
 * two concurrent requests both pass a "has this been used?" read before either
 * inserted.
 */
export async function claimReceipt(
  supabase: TypedSupabaseClient,
  payment: VerifiedPayment,
  purpose: 'list-domain' | 'vote',
  payer: string
): Promise<void> {
  const { error } = await supabase.from('payment_receipts').insert({
    tx_id: payment.txId,
    purpose,
    payer,
    amount_sompi: payment.paidSompi.toString(),
  });

  if (!error) return;

  // 23505 = unique_violation: this receipt has already funded something.
  if (error.code === '23505') {
    throw new VerificationError(
      'That payment has already been used. Each fee transaction can only be spent once.',
      409
    );
  }

  console.error('Failed to claim payment receipt:', error);
  throw new VerificationError('Could not record the payment.', 500);
}

/**
 * Release a claimed receipt after a failed write, so the payer can retry with
 * the same transaction instead of paying twice.
 *
 * Best-effort by design: if this fails the money is still recorded as spent,
 * which is the safe direction (never double-spendable), but it does mean a
 * stuck receipt. Log loudly so it can be released by hand.
 */
export async function releaseReceipt(
  supabase: TypedSupabaseClient,
  txId: string
): Promise<void> {
  const { error } = await supabase.from('payment_receipts').delete().eq('tx_id', txId);
  if (error) {
    console.error(
      `Payment receipt ${txId} could not be released after a failed write. ` +
        'The payer will need it cleared manually before they can retry.',
      error
    );
  }
}
