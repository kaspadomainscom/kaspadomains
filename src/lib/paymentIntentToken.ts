import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * The signed token behind a payment intent: mint, and check.
 *
 * ## Why this is separate from `server/paymentIntent.ts`
 *
 * Purely so it can be tested. The test runner strips types but resolves neither
 * `@/` aliases nor extensionless relative imports, so a module is only testable
 * if it imports nothing but Node builtins. `paymentIntent.ts` needs
 * `VerificationError` to throw, which made the token logic — the part that
 * decides whether a payment request is authentic — impossible to cover.
 *
 * So this module holds the crypto and returns a **result** rather than throwing,
 * and `paymentIntent.ts` is the thin wrapper that turns a failure into an HTTP
 * status. That split is worth having on its own merits: deciding whether a token
 * is valid and deciding what to tell the user are different jobs.
 *
 * ## What the token is, and is not
 *
 * It proves a preflight ran for *this* signer, *this* action, *this* domain,
 * recently. It is **not** a capability: holding someone else's is worthless,
 * because the write path re-verifies ownership, re-verifies the payment on-chain
 * and consumes the receipt through the global ledger. Delete this module
 * entirely and nothing becomes forgeable — users would only go back to paying
 * before finding out whether the server could act.
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
 * Ten minutes. Long enough for a slow wallet confirmation and a mempool wait,
 * short enough that a quoted price cannot go stale. Deliberately longer than the
 * five-minute signature window: the payment happens *between* the preflight and
 * the write, so the token has to outlive both signatures.
 */
export const INTENT_TTL_MS = 10 * 60 * 1000;

const LABEL = 'kaspadomains:payment-intent:v1';

/**
 * Derive the signing key rather than using the secret directly.
 *
 * Same secret, but a key that only ever signs intents cannot be confused with
 * one that talks to the database, and a leaked token reveals nothing about the
 * key it came from.
 */
function intentKey(secret: string): Buffer {
  return createHmac('sha256', secret).update(LABEL).digest();
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function sign(secret: string, body: string): string {
  return base64url(createHmac('sha256', intentKey(secret)).update(body).digest());
}

export function issueIntentToken(
  secret: string,
  claims: IntentClaims,
  now: number = Date.now()
): { intent: string; expiresAt: number } {
  const expiresAt = now + INTENT_TTL_MS;
  const body = base64url(JSON.stringify({ ...claims, expiresAt }));
  return { intent: `${body}.${sign(secret, body)}`, expiresAt };
}

/**
 * Whether a token is authentic, unexpired, and describes the action being
 * attempted.
 *
 * Returns a plain boolean on purpose. Every failure is the same answer to the
 * caller — saying *which* field failed would let someone probe for a valid
 * combination, and the honest user-facing message is identical in every case:
 * start again.
 */
export function isIntentTokenValid(
  secret: string,
  token: string,
  expected: IntentClaims,
  now: number = Date.now()
): boolean {
  const raw = token?.trim() ?? '';
  const separator = raw.lastIndexOf('.');
  if (separator <= 0) return false;

  const body = raw.slice(0, separator);
  const signature = raw.slice(separator + 1);

  // Constant-time compare. `timingSafeEqual` throws on a length mismatch, so
  // the lengths are checked first rather than letting that become the failure.
  const a = Buffer.from(signature);
  const b = Buffer.from(sign(secret, body));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  let claims: IntentClaims & { expiresAt?: number };
  try {
    claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return false;
  }

  if (typeof claims.expiresAt !== 'number' || claims.expiresAt < now) return false;

  return (
    claims.action === expected.action &&
    claims.domain === expected.domain &&
    claims.signer === expected.signer &&
    claims.amountSompi === expected.amountSompi
  );
}
