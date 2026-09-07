/**
 * Probe whether a public Supabase client is blocked by Row Level Security
 * without ever creating a directory row.
 */

export type RlsProbePayload = {
  // The domains table declares all three columns NOT NULL. A permissive policy
  // therefore reaches a constraint error before anything can be persisted.
  domain_hash: null;
  name: null;
  owner: null;
};

export type RlsProbeError = { code?: string | null; message?: string | null };
export type RlsProbeKind = 'blocked' | 'open' | 'unknown';

export type RlsProbeOutcome = {
  kind: RlsProbeKind;
  error: RlsProbeError | null;
};

type InsertProbe = (payload: RlsProbePayload) => Promise<{ error: RlsProbeError | null }>;

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

function isTransportFailure(error: RlsProbeError): boolean {
  const message = (error.message ?? '').toLowerCase();
  return TRANSPORT_HINTS.some((hint) => message.includes(hint));
}

export async function runRlsProbe(insert: InsertProbe): Promise<RlsProbeOutcome> {
  const { error } = await insert({ domain_hash: null, name: null, owner: null });
  if (!error) return { kind: 'open', error: null };

  if (error.code === 'PGRST205') return { kind: 'unknown', error };
  if (error.code === '42501' || /row-level security/i.test(error.message ?? '')) {
    return { kind: 'blocked', error };
  }
  if (isTransportFailure(error)) return { kind: 'unknown', error };

  // A non-RLS database error proves the request reached the database without
  // being refused by policy. The null payload makes this safe: constraints
  // reject it before a row can be stored.
  return { kind: 'open', error };
}
