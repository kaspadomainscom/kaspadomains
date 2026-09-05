// src/lib/supabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase is the primary store for listings, votes and categories while the
 * Kasplex contracts are unreachable (see docs/BUGS.md). The on-chain code path
 * is still present and takes over automatically when Supabase isn't
 * configured, so nothing is lost when the contracts come back.
 *
 * Nothing here throws at import time. An unconfigured deployment must degrade
 * to the chain path and honest error states, not crash the whole app during
 * module evaluation -- that would take down pages that never touch the
 * database.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

/** True when public reads can be served from Supabase. */
export const isSupabaseConfigured = Boolean(url && anonKey);

/** True when the server is able to write (listings, votes, resources). */
export const isSupabaseWritable = Boolean(url && serviceRoleKey);

let readClient: SupabaseClient | null = null;

/**
 * Read-only client, safe to use from the browser and from server components.
 * Uses the anon key, which under this schema's RLS can select but never write.
 * Returns null when unconfigured so callers fall back to the chain.
 */
export function getSupabaseReadClient(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  if (!readClient) {
    readClient = createClient(url, anonKey, {
      auth: { persistSession: false },
    });
  }
  return readClient;
}

/**
 * Service-role client. Bypasses RLS, so it must never be constructed in code
 * that can reach the browser -- call it only from route handlers and server
 * actions, and only after the caller has been verified (wallet signature +
 * KNS ownership).
 *
 * Deliberately not memoised in a module-level singleton that a client bundle
 * could capture, and it throws rather than returning null: a write path that
 * silently no-ops is worse than one that fails loudly.
 */
export function getSupabaseAdminClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error(
      'getSupabaseAdminClient() was called in the browser. The service-role key must stay server-side.'
    );
  }
  if (!url || !serviceRoleKey) {
    throw new Error(
      'Supabase is not configured for writes. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

/** The configured project origin, for the CSP connect-src allowlist. */
export function getSupabaseOrigin(): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}
