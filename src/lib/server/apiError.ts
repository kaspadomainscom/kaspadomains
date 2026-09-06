import { NextResponse } from 'next/server';
import { VerificationError } from './verificationError';

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
