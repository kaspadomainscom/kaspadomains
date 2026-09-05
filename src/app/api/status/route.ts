// src/app/api/status/route.ts
import { NextResponse } from 'next/server';
import {
  isSupabaseConfigured,
  isSupabaseWritable,
  getSupabaseAdminClient,
  getSupabaseReadClient,
} from '@/lib/supabase';
import { TABLE_NAMES, REQUIRED_SCHEMA_VERSION } from '@/lib/database.types';
import {
  isFeeCollectionConfigured,
  TREASURY_ADDRESS,
  LISTING_FEE_SOMPI,
  VOTE_FEE_SOMPI,
  formatKas,
} from '@/lib/fees';

export const runtime = 'nodejs';
// Health is worthless cached: the whole point is what is true right now.
export const dynamic = 'force-dynamic';

/**
 * What state is this deployment actually in?
 *
 * Every failure this reports has, at some point, been invisible: the schema not
 * run, a secret key that was really a database password, a treasury address left
 * unset. Each of those degrades the app into a *quieter* version of itself
 * rather than a broken one -- listings fall back to contracts with no deployed
 * code, or writes answer 503 -- so nothing surfaces until someone loses money or
 * gives up.
 *
 * Deliberately public and deliberately thin on detail. It reports whether a
 * thing is configured and reachable, never the values: no keys, no key
 * prefixes, no connection strings. The treasury address is the exception, and
 * only because it is already published to every user who pays a fee.
 */

/**
 * Turn an opaque client error into something actionable.
 *
 * supabase-js flattens every transport failure to the string
 * `TypeError: fetch failed` -- the underlying cause is dropped. On a machine
 * running TLS-intercepting antivirus (Avast, Kaspersky, a corporate proxy),
 * Node rejects the intercepted certificate chain with
 * UNABLE_TO_VERIFY_LEAF_SIGNATURE and every server-side query fails while the
 * browser, which trusts the OS certificate store, works perfectly. That split
 * is deeply confusing to debug from the message alone, so name the likely cause
 * here rather than making the next person find it again.
 */
function explainTransportFailure(message: string): string | undefined {
  if (!/fetch failed/i.test(message)) return undefined;
  return (
    'The server could not open a connection. If the browser can reach Supabase but ' +
    'the server cannot, this is almost always TLS interception (antivirus or a ' +
    'corporate proxy): set NODE_EXTRA_CA_CERTS to its root certificate, or run Node ' +
    'with --use-system-ca, and restart the dev server.'
  );
}

type Check = {
  id: string;
  label: string;
  state: 'ok' | 'warn' | 'fail' | 'unknown';
  detail: string;
  /** What the operator should do about it. Omitted when nothing is wrong. */
  action?: string;
};

async function checkSchema(): Promise<Check[]> {
  if (!isSupabaseWritable) {
    return [
      {
        id: 'schema',
        label: 'Database schema',
        state: 'unknown',
        detail: 'Cannot be checked without a server key.',
        action: 'Set SUPABASE_SECRET_KEY.',
      },
    ];
  }

  const supabase = getSupabaseAdminClient();
  const missing: string[] = [];
  const unreachable: string[] = [];
  let firstFailure = '';

  await Promise.all(
    TABLE_NAMES.map(async (table) => {
      const { error } = await supabase.from(table).select('*').limit(0);
      if (!error) return;
      // PGRST205 is PostgREST's "no such table in the schema cache".
      if (error.code === 'PGRST205') {
        missing.push(table);
        return;
      }
      // Anything else -- a network failure, a refused connection -- means the
      // check did not run. Counting that as "present" is how a health page ends
      // up reporting green while nothing works; only an actual successful query
      // proves a table exists.
      unreachable.push(table);
      if (!firstFailure) firstFailure = error.message || error.code || 'unknown error';
    })
  );

  if (unreachable.length > 0) {
    return [
      {
        id: 'schema',
        label: 'Database schema',
        state: 'unknown',
        detail: `Could not check ${unreachable.length} of ${TABLE_NAMES.length} tables: ${firstFailure}`,
        action:
          explainTransportFailure(firstFailure) ??
          'The database could not be reached. Check the URL and key, then re-check.',
      },
    ];
  }

  if (missing.length === TABLE_NAMES.length) {
    return [
      {
        id: 'schema',
        label: 'Database schema',
        state: 'fail',
        detail: 'No tables exist. The schema has never been applied.',
        action: 'Run supabase/schema.sql in the Supabase SQL Editor.',
      },
    ];
  }

  if (missing.length > 0) {
    return [
      {
        id: 'schema',
        label: 'Database schema',
        state: 'fail',
        detail: `Missing: ${missing.join(', ')}.`,
        action: 'Apply the migrations in supabase/migrations/, in filename order.',
      },
    ];
  }

  return [
    {
      id: 'schema',
      label: 'Database schema',
      state: 'ok',
      detail: `All ${TABLE_NAMES.length} tables present.`,
    },
  ];
}

/**
 * Are the atomic write functions present?
 *
 * Separate from the table check because a database can have every table and
 * still be missing migration 3, in which case reads work perfectly and every
 * paid write fails -- after payment. The preflight refuses in that state; this
 * says why.
 */
async function checkSchemaVersion(): Promise<Check> {
  if (!isSupabaseWritable) {
    return {
      id: 'schema-version',
      label: 'Atomic write functions',
      state: 'unknown',
      detail: 'Cannot be checked without a server key.',
    };
  }

  const { data, error } = await getSupabaseAdminClient().rpc('kaspadomains_schema_version');

  if (error) {
    // PGRST202 is "no such function": the migration has not been applied.
    return {
      id: 'schema-version',
      label: 'Atomic write functions',
      state: error.code === 'PGRST202' ? 'fail' : 'unknown',
      detail:
        error.code === 'PGRST202'
          ? 'Missing. Paid writes are disabled until they exist.'
          : `Could not check: ${error.message || error.code}`,
      action:
        error.code === 'PGRST202'
          ? 'Apply supabase/migrations/0003_atomic_writes.sql.'
          : undefined,
    };
  }

  const found = Number(data ?? 0);
  if (found < REQUIRED_SCHEMA_VERSION) {
    return {
      id: 'schema-version',
      label: 'Atomic write functions',
      state: 'fail',
      detail: `Database is at version ${found}; this build needs ${REQUIRED_SCHEMA_VERSION}.`,
      action: 'Apply the remaining files in supabase/migrations/, in filename order.',
    };
  }

  return {
    id: 'schema-version',
    label: 'Atomic write functions',
    state: 'ok',
    detail: `Database schema version ${found}.`,
  };
}

async function checkPublicRead(): Promise<Check> {
  const client = getSupabaseReadClient();
  if (!client) {
    return {
      id: 'read',
      label: 'Public reads',
      state: 'fail',
      detail: 'Supabase is not configured, so listings fall back to the contracts.',
      action: 'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    };
  }

  const { error } = await client.from('categories').select('key').limit(1);
  if (error) {
    return {
      id: 'read',
      label: 'Public reads',
      state: 'fail',
      detail:
        error.code === 'PGRST205'
          ? 'The categories table does not exist.'
          : // Say what actually went wrong. "Refused." with no reason sent me
            // looking at RLS for a problem that was a failed connection.
            `Failed: ${error.message || error.code || 'unknown error'}`,
      action:
        error.code === 'PGRST205'
          ? 'Run supabase/schema.sql, then re-check.'
          : explainTransportFailure(error.message ?? '') ??
            'Check NEXT_PUBLIC_SUPABASE_URL and the publishable key.',
    };
  }

  return { id: 'read', label: 'Public reads', state: 'ok', detail: 'Reachable with the public key.' };
}

/**
 * The check that matters most: the publishable key ships to every browser, so
 * if it can write, anybody can forge a listing and the owner-only API is
 * decorative.
 */
async function checkRls(): Promise<Check> {
  const client = getSupabaseReadClient();
  if (!client) {
    return {
      id: 'rls',
      label: 'Row Level Security',
      state: 'unknown',
      detail: 'Cannot be checked without the public key.',
    };
  }

  const { error } = await client.from('domains').insert({
    domain_hash: '0',
    name: `status-probe-${Date.now()}.invalid`,
    owner: 'kaspa:status-probe',
  });

  if (!error) {
    return {
      id: 'rls',
      label: 'Row Level Security',
      state: 'fail',
      detail: 'The public key was able to INSERT. Anyone can forge a listing.',
      action: 'Re-run the RLS section of supabase/schema.sql immediately.',
    };
  }

  if (error.code === 'PGRST205') {
    return {
      id: 'rls',
      label: 'Row Level Security',
      state: 'unknown',
      detail: 'Inconclusive — the table does not exist yet.',
      action: 'Run supabase/schema.sql, then re-check.',
    };
  }

  // Only a refusal by the database proves RLS is working. A failed connection
  // also produces an error, and reading that as "writes are blocked" would make
  // this check pass hardest exactly when it can see least.
  if (error.code !== '42501' && !/row-level security/i.test(error.message ?? '')) {
    return {
      id: 'rls',
      label: 'Row Level Security',
      state: 'unknown',
      detail: `Inconclusive — the write was refused, but not by RLS: ${
        error.message || error.code || 'unknown error'
      }`,
    };
  }

  return {
    id: 'rls',
    label: 'Row Level Security',
    state: 'ok',
    detail: 'Public writes are refused by RLS.',
  };
}

export async function GET() {
  const checks: Check[] = [];

  checks.push({
    id: 'supabase-read',
    label: 'Supabase configured',
    state: isSupabaseConfigured ? 'ok' : 'fail',
    detail: isSupabaseConfigured
      ? 'URL and public key are set.'
      : 'Not configured; the app is on the contract fallback.',
    action: isSupabaseConfigured ? undefined : 'Set the two NEXT_PUBLIC_SUPABASE_* variables.',
  });

  checks.push({
    id: 'supabase-write',
    label: 'Server writes enabled',
    state: isSupabaseWritable ? 'ok' : 'fail',
    detail: isSupabaseWritable
      ? 'A server key is present.'
      : 'No server key, so listing, voting and editing all answer 503.',
    action: isSupabaseWritable ? undefined : 'Set SUPABASE_SECRET_KEY (sb_secret_…).',
  });

  checks.push({
    id: 'treasury',
    label: 'Fee collection',
    state: isFeeCollectionConfigured ? 'ok' : 'fail',
    detail: isFeeCollectionConfigured
      ? `Fees go to ${TREASURY_ADDRESS}.`
      : TREASURY_ADDRESS.length === 0
        ? 'No treasury address set, so paid actions are disabled.'
        : 'The treasury address is not a valid kaspa: address, so paid actions are disabled.',
    action: isFeeCollectionConfigured
      ? undefined
      : 'Set NEXT_PUBLIC_KASPADOMAINS_TREASURY_ADDRESS to a kaspa: address you control.',
  });

  if (isSupabaseConfigured || isSupabaseWritable) {
    const [schema, version, read, rls] = await Promise.all([
      checkSchema(),
      checkSchemaVersion(),
      checkPublicRead(),
      checkRls(),
    ]);
    checks.push(...schema, version, read, rls);
  }

  const failing = checks.filter((c) => c.state === 'fail');
  const unknown = checks.filter((c) => c.state === 'unknown');

  return NextResponse.json(
    {
      // "degraded" rather than "ok" when something could not be determined:
      // an unknown is not a pass, and reporting it as one is how this class of
      // problem stayed invisible in the first place.
      status: failing.length > 0 ? 'down' : unknown.length > 0 ? 'degraded' : 'ok',
      checkedAt: new Date().toISOString(),
      fees: {
        listing: formatKas(LISTING_FEE_SOMPI),
        vote: formatKas(VOTE_FEE_SOMPI),
        treasury: isFeeCollectionConfigured ? TREASURY_ADDRESS : null,
      },
      source: isSupabaseConfigured ? 'supabase' : 'kasplex-contracts',
      checks,
    },
    {
      status: failing.length > 0 ? 503 : 200,
      headers: { 'cache-control': 'no-store' },
    }
  );
}
