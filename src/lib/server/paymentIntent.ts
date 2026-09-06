// src/lib/server/paymentIntent.ts
import { VerificationError } from './verificationError';
import {
  isIntentTokenValid,
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
 * Check that an intent is authentic, unexpired, and describes the action being
 * attempted -- throwing the HTTP-shaped error the routes expect.
 *
 * Every mismatch is the same message. Saying *which* field failed would let
 * someone probe for a valid combination, and the honest user-facing answer is
 * identical in every case: start again.
 */
export function verifyPaymentIntent(token: string, expected: IntentClaims): void {
  if (!isIntentTokenValid(intentSecret(), token, expected)) {
    throw new VerificationError(
      'This request has expired. Start again so the fee can be re-quoted.',
      409
    );
  }
}
