/**
 * What to do when a request that has **already been paid for** comes back
 * failed.
 *
 * ## The bug this exists for
 *
 * The paid flow is preflight -> pay -> write. Payment is a real Kaspa
 * transaction, and the wallet returns as soon as it is *submitted* -- the
 * network still has to accept it and the indexer still has to see it. So the
 * write, sent milliseconds later, very often arrives before the payment is
 * visible, and the server correctly answers "not found yet" or "not accepted
 * yet".
 *
 * The client used to treat that as final: it showed the server's "try again"
 * message and threw the transaction id away. Trying again re-ran the whole
 * flow, so the advice on screen was an instruction to pay a **second** 200 KAS.
 * The transient case was not an edge case either -- it is what happens on a
 * normal, successful payment.
 *
 * So the retry has to reuse the same payment, which is what this decides.
 *
 * ## Why the server has to say whether a failure is transient
 *
 * Status alone cannot carry it: a 409 is both "the network has not accepted
 * your payment yet" (wait) and "your intent expired" (start over). Guessing
 * wrong in one direction charges someone twice; in the other it hammers an
 * endpoint that will never succeed. The server sets `retryable` at the throw
 * site and this module trusts it.
 */

/** The result of one attempt: either the request travelled, or it did not. */
export type PaidWriteAttempt =
  | { transport: 'failed' }
  | {
      transport: 'ok';
      ok: boolean;
      status: number;
      body: { error?: string; retryable?: boolean; code?: string };
    };

export type PaidWriteDecision =
  | { kind: 'success' }
  /** A previous attempt landed; the write is done and must not be repeated. */
  | { kind: 'already-done'; message: string }
  | { kind: 'retry'; afterMs: number }
  | { kind: 'failed'; message: string };

/**
 * Long enough for the network to accept a payment and the indexer to publish
 * it, short enough to stay inside both the five-minute signature window (the
 * request is signed once and resent unchanged) and the ten-minute intent.
 */
export const RETRY_DEADLINE_MS = 90_000;

const FIRST_DELAY_MS = 1_500;
const MAX_DELAY_MS = 8_000;
const GROWTH = 1.6;

/**
 * Database codes that mean the write we are retrying has already happened.
 *
 * This is safe to read as success rather than as a collision. A receipt is
 * bound to the payer: the server requires the fee to come from the same wallet
 * that signed the request, so our transaction id can only ever be consumed by
 * our own request. If it is spent by the time we retry, we are the ones who
 * spent it -- on the attempt whose answer we never received.
 *
 * Without this, the fix for one double-charge would introduce another: a retry
 * after a dropped response would report "that payment has already been used" to
 * someone whose listing had in fact gone through.
 */
const ALREADY_DONE = new Set(['KD001', 'KD002', 'KD004']);

/** Backoff for `attempt` (1-based), before jitter. */
export function retryDelayMs(attempt: number): number {
  const grown = FIRST_DELAY_MS * Math.pow(GROWTH, Math.max(0, attempt - 1));
  return Math.round(Math.min(grown, MAX_DELAY_MS));
}

export function decidePaidWrite(input: {
  attemptResult: PaidWriteAttempt;
  /** 1-based. */
  attempt: number;
  /** Milliseconds since the payment was made. */
  elapsedMs: number;
  fallbackMessage: string;
}): PaidWriteDecision {
  const { attemptResult, attempt, elapsedMs, fallbackMessage } = input;

  const keepTrying = (): PaidWriteDecision => {
    const afterMs = retryDelayMs(attempt);
    // Do not start a wait that runs past the deadline: the request would be
    // sent with a signature or an intent that had already expired, turning a
    // recoverable failure into a confusing one.
    if (elapsedMs + afterMs >= RETRY_DEADLINE_MS) {
      return { kind: 'failed', message: fallbackMessage };
    }
    return { kind: 'retry', afterMs };
  };

  if (attemptResult.transport === 'failed') return keepTrying();
  if (attemptResult.ok) return { kind: 'success' };

  const { body } = attemptResult;

  // Only on a retry. On the first attempt these mean what they say -- the
  // domain really was already listed, or already voted for, by someone else or
  // in another tab -- and reporting success would be a lie.
  if (attempt > 1 && body.code && ALREADY_DONE.has(body.code)) {
    return { kind: 'already-done', message: body.error || fallbackMessage };
  }

  if (body.retryable === true) return keepTrying();

  return { kind: 'failed', message: body.error || fallbackMessage };
}
