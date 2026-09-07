// src/lib/server/rpcError.ts
import type { PostgrestError } from '@supabase/supabase-js';
import { VerificationError } from './verificationError';
import {
  classifyStoreError,
  isStoreFailureRetryable,
  storeFailureMessage,
  storeFailureStatus,
} from '../storeError';

/**
 * Turn a Postgres error from one of the atomic write functions into an HTTP
 * answer.
 *
 * The functions raise custom SQLSTATEs (see
 * `supabase/migrations/0003_atomic_writes.sql`) rather than relying on the
 * native constraint violations, because two different unique constraints can
 * both raise `23505` and they mean completely different things to a user --
 * "you already did this" and "that payment is already spent". Matching on a
 * code rather than on a message means the copy can change without silently
 * breaking the mapping.
 */
const CODES: Record<string, { status: number; message: string }> = {
  KD001: { status: 409, message: 'That payment has already been used. Each fee transaction can only be spent once.' },
  KD002: { status: 409, message: 'That domain is already listed.' },
  KD004: { status: 409, message: 'This wallet has already voted for that domain.' },
  KD005: { status: 404, message: 'That domain is not listed.' },
  KD006: { status: 409, message: 'This save request expired or was already used. Reload and try again.' },
  KD007: { status: 409, message: 'This profile changed in another tab. Reload before saving.' },
};

export function rpcError(error: PostgrestError, fallback: string): VerificationError {
  const known = CODES[error.code];
  // The code travels with the error. A client that has already paid needs to
  // tell "your payment was consumed by your own earlier attempt" (KD001/KD002,
  // which mean the write landed) apart from every other 409.
  if (known) return new VerificationError(known.message, known.status, { code: error.code });

  // KD003 carries the offending category name, so use the database's own text.
  if (error.code === 'KD003') {
    return new VerificationError(error.message || 'That category is not available.', 400);
  }

  // Anything that is not one of our own KD codes is classified rather than
  // guessed at. This was a third hand-written copy of the same five setup codes,
  // and like the other two it had no answer for an *unreachable* database, so a
  // network failure became a 500 -- a claim that the bug is in this code.
  const failure = classifyStoreError(error);
  if (failure !== 'unexpected') {
    return new VerificationError(
      storeFailureMessage(failure, fallback),
      storeFailureStatus(failure),
      { retryable: isStoreFailureRetryable(failure) }
    );
  }

  console.error('Atomic write failed:', error);
  return new VerificationError(fallback, 500);
}
