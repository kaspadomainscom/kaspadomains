// src/lib/supabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/**
 * Supabase is the current directory store for listings, votes and categories.
 * The unusable Kasplex contract path was removed, so an unconfigured database
 * must produce an honest unavailable state rather than pretend there is a
 * fallback.
 *
 * Nothing here throws at import time. An unconfigured deployment must render
 * honest unavailable states rather than crash the whole app during module
 * evaluation -- that would take down pages that never touch the database.
 */

/**
 * Every client is typed against the schema in `database.types.ts`, so a column
 * that gets renamed in SQL without being renamed here is a compile error rather
 * than an `undefined` that renders as a blank cell.
 */
export type TypedSupabaseClient = SupabaseClient<Database>;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

// Supabase renamed the public key from "anon" to "publishable" (sb_publishable_…)
// and the secret one from "service_role" to "secret" (sb_secret_…). Accept both
// spellings so a project set up under either naming works without edits.
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

const serviceRoleKey =
  process.env.SUPABASE_SECRET_KEY?.trim() ||
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

/** True when public reads can be served from Supabase. */
export const isSupabaseConfigured = Boolean(url && anonKey);

/** True when the server is able to write (listings, votes, resources). */
export const isSupabaseWritable = Boolean(url && serviceRoleKey);

let readClient: TypedSupabaseClient | null = null;

/**
 * Read-only client, safe to use from the browser and from server components.
 * Uses the anon key, which under this schema's RLS can select but never write.
 * Returns null when unconfigured so callers can render an honest unavailable
 * state without constructing a broken client.
 */
export function getSupabaseReadClient(): TypedSupabaseClient | null {
  if (!url || !anonKey) return null;
  if (!readClient) {
    readClient = createClient<Database>(url, anonKey, {
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
export function getSupabaseAdminClient(): TypedSupabaseClient {
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
  return createClient<Database>(url, serviceRoleKey, {
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
