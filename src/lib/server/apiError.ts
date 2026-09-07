import { NextResponse } from 'next/server';
import { VerificationError } from './verificationError';
import {
  classifyStoreError,
  isStoreFailureRetryable,
  storeFailureMessage,
  storeFailureStatus,
} from '../storeError';

/**
 * Render a failed verification as the API's error response.
 *
 * Every route was doing this by hand — ten copies of the same four lines. That
 * was survivable while the body was just `{ error }`, but it stopped being
 * survivable once the body had to carry `retryable`: a route that forgot the
 * flag would look completely normal and would quietly cost a user 200 KAS,
 * because the client would treat a transient failure as final and the next
 * attempt would pay again. One renderer means the flag cannot be forgotten.
 *
 * Anything that is not a `VerificationError` is rethrown rather than flattened
 * into a 500 here. An unexpected error is a bug, and it should reach the
 * framework's handler with its stack intact.
 */
export function verificationFailure(error: unknown): NextResponse {
  if (!(error instanceof VerificationError)) throw error;

  return NextResponse.json(
    {
      error: error.message,
      // Omitted rather than sent as false, so the wire format says "this is a
      // claim the server is making", not "this field defaults to something".
      ...(error.retryable ? { retryable: true } : {}),
      ...(error.code ? { code: error.code } : {}),
    },
    { status: error.status }
  );
}

/**
 * Render a failed Supabase call as an honest response.
 *
 * The routes were deciding this inline, and all of them asked only "is the
 * schema missing?" -- so an unreachable database became a 500, which claims the
 * bug is ours. This asks the fuller question once and carries the answer through
 * to the status, the message and `retryable`, which the client uses to decide
 * whether trying again is worth anything.
 *
 * `fallback` is the message for the genuinely unexpected case, where the caller
 * knows what the request was for and the classifier does not.
 */
export function storeFailure(
  error: { code?: string | null; message?: string | null } | null | undefined,
  fallback: string
): NextResponse {
  const failure = classifyStoreError(error);

  return NextResponse.json(
    {
      error: storeFailureMessage(failure, fallback),
      ...(isStoreFailureRetryable(failure) ? { retryable: true } : {}),
    },
    { status: storeFailureStatus(failure) }
  );
}
