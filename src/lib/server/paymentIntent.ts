// src/lib/server/paymentIntent.ts
import { VerificationError } from './verificationError';
import {
  checkIntentToken,
  issueIntentToken,
  type IntentAction,
  type IntentClaims,
} from '../paymentIntentToken';

export type { IntentAction, IntentClaims };

/**
 * A short-lived promise from the server: "I have checked everything that can
 * fail, and if you pay this amount I will fulfil this action."
 *
 * ## Why this exists
 *
 * The browser used to ask the wallet for money and only *then* find out whether
 * the server could do anything with it. The two sides decide separately: the
 * client picks the off-chain flow from the **public** Supabase key, while the
 * API needs the **server-only** secret key and can still refuse for ownership,
 * duplicate-state or category reasons. Deploy with a valid public key and a
 * missing secret one and the wallet sends 200 KAS to a route that answers 503.
 *
 * An intent inverts that: every check runs first, at no cost, and the wallet is
 * only asked to pay once the server has committed.
 *
 * ## Why it is signed rather than stored
 *
 * A row in the database would work but buys nothing here. The intent is not a
 * capability -- it cannot be spent, and holding someone else's is worthless
 * because the write path re-verifies ownership, re-verifies the payment, and
 * consumes the receipt through the global ledger. Its only job is to prove the
 * preflight actually ran for *this* signer, *this* action, *this* domain,
 * recently. An HMAC does that with no table, no migration and no cleanup job.
 *
 * It is deliberately **not** a replacement for any check. Every write route
 * still verifies the signature, the KNS owner and the payment from scratch. If
 * this module were removed entirely, nothing would become forgeable -- users
 * would just go back to paying before finding out.
 */

/**
 * The signing secret. Fails closed: falling back to a constant would make every
 * intent forgeable and, worse, would look like it was working.
 */
function intentSecret(): string {
  const secret =
    process.env.PAYMENT_INTENT_SECRET?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!secret) {
    throw new VerificationError(
      'Payments are not configured on this deployment, so this action is unavailable.',
      503
    );
  }
  return secret;
}

/** Issue an intent for claims the caller has already verified. */
export function issuePaymentIntent(claims: IntentClaims): {
  intent: string;
  expiresAt: number;
} {
  return issueIntentToken(intentSecret(), claims);
}

/**
 * Check that an intent is authentic and describes the action being attempted.
 *
 * ## Why an expired intent is not refused
 *
 * The routes verify this **after** the client has paid -- the fee is sent
 * between the preflight and the write, which is the whole point of the design.
 * So every refusal here lands on someone whose money has already gone, and
 * "start again so the fee can be re-quoted" meant "pay a second 200 KAS". A
 * user who left a wallet prompt open for ten minutes would have lost the fee
 * for doing nothing wrong. See `MIND.md` #22.
 *
 * Dropping the age requirement costs nothing, because age was never what this
 * token proved. It proves a preflight ran for this signer, this action and this
 * domain -- and that stays true at any age. Nor was the TTL protecting a stale
 * quote: the routes compare the claimed amount against the *current* fee
 * constant, so an old token cannot authorise an old price.
 *
 * Everything that could make an old intent dangerous is re-checked from scratch
 * at write time anyway: the signature (five-minute window of its own), KNS
 * ownership, the payment on-chain, the payer binding, the category allow-list,
 * and the single-use receipt. This module's own header says it plainly -- delete
 * it entirely and nothing becomes forgeable.
 *
 * A **forged or mismatched** token is still refused, and still before the
 * payment is checked. That is not a user who was slow; it is a client that did
 * not follow the flow.
 *
 * Returns the verdict so a caller can log how often this happens without
 * changing what it does.
 */
export function verifyPaymentIntent(
  token: string,
  expected: IntentClaims
): 'valid' | 'expired' {
  const verdict = checkIntentToken(intentSecret(), token, expected);

  if (verdict === 'invalid') {
    // One message for every kind of mismatch. Saying *which* field failed would
    // let someone probe for a valid combination.
    throw new VerificationError(
      'This request could not be confirmed. Start again so the fee can be re-quoted.',
      409
    );
  }

  return verdict;
}
