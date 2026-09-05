// src/lib/server/paymentIntent.ts
import { createHmac, timingSafeEqual } from 'node:crypto';
import { VerificationError } from './verifyRequest';

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

export type IntentAction = 'list-domain' | 'vote';

export type IntentClaims = {
  action: IntentAction;
  /** Normalised domain name, lowercased. */
  domain: string;
  /** The `kaspa:` address the preflight was signed by. */
  signer: string;
  /** Amount quoted, as a decimal sompi string. */
  amountSompi: string;
};

/**
 * Ten minutes. Long enough to cover a slow wallet confirmation and a
 * mempool wait, short enough that a quoted price cannot go stale. Kept longer
 * than the five-minute signature window on purpose: the payment happens between
 * the preflight and the write, so the intent has to outlive both signatures.
 */
const TTL_MS = 10 * 60 * 1000;

const LABEL = 'kaspadomains:payment-intent:v1';

/**
 * Derive the signing key rather than using the service-role key directly.
 *
 * Same secret, but a key that only ever signs intents cannot be confused with
 * one that talks to the database, and a leaked intent token reveals nothing
 * about the key it came from.
 */
function intentKey(): Buffer {
  const secret =
    process.env.PAYMENT_INTENT_SECRET?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!secret) {
    // Fail closed. Falling back to a constant would make every intent forgeable
    // and, worse, would look like it was working.
    throw new VerificationError(
      'Payments are not configured on this deployment, so this action is unavailable.',
      503
    );
  }

  return createHmac('sha256', secret).update(LABEL).digest();
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function sign(body: string): string {
  return base64url(createHmac('sha256', intentKey()).update(body).digest());
}

/** Issue an intent for claims the caller has already verified. */
export function issuePaymentIntent(claims: IntentClaims): {
  intent: string;
  expiresAt: number;
} {
  const expiresAt = Date.now() + TTL_MS;
  const body = base64url(JSON.stringify({ ...claims, expiresAt }));
  return { intent: `${body}.${sign(body)}`, expiresAt };
}

/**
 * Check that an intent is authentic, unexpired, and describes the action being
 * attempted.
 *
 * Every mismatch is the same error to the caller. Saying *which* field failed
 * would let someone probe for a valid combination, and the honest user-facing
 * answer is identical in every case: start again.
 */
export function verifyPaymentIntent(token: string, expected: IntentClaims): void {
  const stale = new VerificationError(
    'This request has expired. Start again so the fee can be re-quoted.',
    409
  );

  const raw = token?.trim() ?? '';
  const separator = raw.lastIndexOf('.');
  if (separator <= 0) throw stale;

  const body = raw.slice(0, separator);
  const signature = raw.slice(separator + 1);

  const expectedSignature = sign(body);
  // Compare in constant time. The lengths are fixed by the algorithm, but
  // timingSafeEqual throws on a mismatch, so check first.
  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSignature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw stale;

  let claims: IntentClaims & { expiresAt?: number };
  try {
    claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    throw stale;
  }

  if (typeof claims.expiresAt !== 'number' || claims.expiresAt < Date.now()) throw stale;

  if (
    claims.action !== expected.action ||
    claims.domain !== expected.domain ||
    claims.signer !== expected.signer ||
    claims.amountSompi !== expected.amountSompi
  ) {
    throw stale;
  }
}
