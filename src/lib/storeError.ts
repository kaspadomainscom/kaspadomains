/**
 * Why a Supabase call failed, as far as the error can tell us.
 *
 * ## Why this exists
 *
 * The "is the database simply not set up?" check was written out three times —
 * in the categories route, the write-nonce route, and `rpcError.ts` — as the
 * same list of five codes, with no owner. That is `MIND.md` #17, and the cost is
 * the usual one: a code added to one copy is missing from the other two, and
 * nothing tells you.
 *
 * More importantly, all three copies had the same gap. They asked one question,
 * "is this a setup problem?", and answered everything else with 500. So an
 * **unreachable** database — the network is down, the project is paused, DNS
 * fails — was reported as an internal server error, which is a claim that the
 * bug is in our code. That sends whoever is on call looking in the wrong place,
 * and it is the wrong signal to a crawler, which treats 500 as "this page is
 * broken" and 503 as "come back later".
 *
 * One catch block cannot honestly report two different failures (`MIND.md` #11),
 * so this names three.
 *
 * Dependency-free, so it can be tested.
 */

export type StoreFailure =
  /** The schema has not been applied, or is older than this code. */
  | 'setup-incomplete'
  /** We never got an answer: transport, DNS, a paused project, a timeout. */
  | 'unreachable'
  /** PostgREST answered, and the answer was not one we anticipated. */
  | 'unexpected';

/**
 * PostgREST and Postgres codes that mean "the schema is not what this code
 * expects": function missing, column missing, table missing.
 */
const SETUP_CODES = new Set(['PGRST202', 'PGRST204', 'PGRST205', '42P01', '42703']);

/**
 * Fragments that appear when the request never reached PostgREST. `fetch failed`
 * is what Node's fetch produces and what supabase-js passes through.
 */
const TRANSPORT_HINTS = [
  'fetch failed',
  'network',
  'econnrefused',
  'econnreset',
  'enotfound',
  'etimedout',
  'timeout',
  'socket hang up',
];

export function classifyStoreError(
  error: { code?: string | null; message?: string | null } | null | undefined
): StoreFailure {
  // No error object at all is not something to guess about. Callers only reach
  // here when something failed, so the honest answer is "we do not know", and
  // 'unexpected' is the branch that says so.
  if (!error) return 'unexpected';

  const code = (error.code ?? '').trim();
  if (SETUP_CODES.has(code)) return 'setup-incomplete';

  const message = (error.message ?? '').toLowerCase();
  if (TRANSPORT_HINTS.some((hint) => message.includes(hint))) return 'unreachable';

  // PostgREST sets a code on every error it returns. Its absence means the
  // failure happened before any response existed -- so this is a transport
  // problem even when the message does not say which one.
  if (!code) return 'unreachable';

  return 'unexpected';
}

/**
 * The HTTP status for a failure of this kind.
 *
 * Both `setup-incomplete` and `unreachable` are 503: the request was fine, the
 * server cannot serve it right now, and trying again later is reasonable advice.
 * Only `unexpected` is a 500, which is the one case where the honest message is
 * "something is wrong with us and we do not know what".
 */
export function storeFailureStatus(failure: StoreFailure): 500 | 503 {
  return failure === 'unexpected' ? 500 : 503;
}

/** Whether trying the same request again could plausibly succeed. */
export function isStoreFailureRetryable(failure: StoreFailure): boolean {
  return failure === 'unreachable';
}

/**
 * What to tell the user, given what we can actually tell apart.
 *
 * Each kind gets a different sentence because each implies a different next
 * step: wait and retry, wait for someone to finish a deployment, or tell us.
 * A single message for all three -- which is what the routes had -- makes the
 * one actionable case indistinguishable from the two that are not.
 *
 * `fallback` is used only for `unexpected`, where the caller knows what the
 * request was for and this module does not.
 */
export function storeFailureMessage(failure: StoreFailure, fallback: string): string {
  switch (failure) {
    case 'setup-incomplete':
      return 'This deployment is not finished setting up, so that is unavailable right now.';
    case 'unreachable':
      return 'The database could not be reached. This is a problem on our side — please try again shortly.';
    case 'unexpected':
      return fallback;
  }
}
