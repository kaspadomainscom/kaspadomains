// src/app/status/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Status | KaspaDomains',
  description:
    'Live health of the KaspaDomains deployment: database, fee collection and write access.',
  alternates: { canonical: 'https://kaspadomains.com/status' },
  // Health is for operators and for anyone wondering why an action failed --
  // not something search engines should rank.
  robots: { index: false, follow: false },
};

type Check = {
  id: string;
  label: string;
  state: 'ok' | 'warn' | 'fail' | 'unknown';
  detail: string;
  action?: string;
};

type Status = {
  status: 'ok' | 'degraded' | 'down';
  checkedAt: string;
  fees: { listing: string; vote: string; treasury: string | null };
  source: 'supabase' | 'unavailable';
  l1Covenant: {
    network: 'testnet-10';
    deployment: 'not-built';
    broadcastEnabled: boolean;
    authoritative: boolean;
  };
  checks: Check[];
};

const STATE_STYLES: Record<Check['state'], string> = {
  ok: 'border-emerald-500/30 bg-emerald-500/5',
  warn: 'border-amber-500/30 bg-amber-500/5',
  fail: 'border-red-500/30 bg-red-500/5',
  unknown: 'border-white/15 bg-white/5',
};

const STATE_LABELS: Record<Check['state'], string> = {
  ok: 'OK',
  warn: 'Warning',
  fail: 'Failing',
  unknown: 'Unknown',
};

const STATE_TEXT: Record<Check['state'], string> = {
  ok: 'text-emerald-300',
  warn: 'text-amber-300',
  fail: 'text-red-300',
  unknown: 'text-gray-300',
};

const HEADLINE: Record<Status['status'], { title: string; blurb: string; tone: string }> = {
  ok: {
    title: 'All systems operational',
    blurb: 'Listings, votes and profile edits are working.',
    tone: 'text-emerald-300',
  },
  degraded: {
    title: 'Partially degraded',
    blurb: 'Some checks could not be completed. Details below.',
    tone: 'text-amber-300',
  },
  down: {
    title: 'Not fully operational',
    blurb: 'At least one thing the site depends on is not working. Details below.',
    tone: 'text-red-300',
  },
};

/**
 * A page that answers "is it me, or is it the site?".
 *
 * Every problem it reports has, at some point in this project's life, been
 * silent: the schema never applied, a database password pasted in where a
 * secret key belonged, a treasury address left blank. None of those produce a
 * crash -- the app cannot serve listings, or answers 503 to every write -- so
 * nothing surfaces until a user loses money
 * or gives up. This makes them visible without needing terminal access.
 */
export default async function StatusPage() {
  // Same-origin fetch of our own route, so this page and any external monitor
  // see the identical result rather than two implementations that can disagree.
  const headerList = await headers();
  const host = headerList.get('host') ?? 'localhost:3000';
  const protocol = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https';

  let status: Status | null = null;
  let fetchError: string | null = null;

  try {
    const response = await fetch(`${protocol}://${host}/api/status`, { cache: 'no-store' });
    // The route answers 503 when something is failing, which is correct for a
    // monitor and must not be treated as "could not load" here -- the body is
    // exactly the report we want to render.
    status = (await response.json()) as Status;
  } catch (error) {
    fetchError = (error as Error).message;
  }

  if (!status) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 text-white">
        <h1 className="text-3xl font-bold">Status</h1>
        <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/5 p-6 text-red-300">
          <p className="font-medium">The status check itself could not run.</p>
          <p className="mt-1 text-sm text-red-300/80">{fetchError}</p>
        </div>
      </main>
    );
  }

  const headline = HEADLINE[status.status];

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-white">
      <h1 className="text-3xl font-bold">Status</h1>
      <p className="mt-2 text-gray-400">
        Live health of this deployment. Nothing here is cached.
      </p>

      <section className={`mt-8 rounded-lg border p-6 ${STATE_STYLES[
        status.status === 'ok' ? 'ok' : status.status === 'degraded' ? 'warn' : 'fail'
      ]}`}>
        <h2 className={`text-xl font-semibold ${headline.tone}`}>{headline.title}</h2>
        <p className="mt-1 text-sm text-gray-300">{headline.blurb}</p>
        <p className="mt-3 text-xs text-gray-500">
          Checked {new Date(status.checkedAt).toUTCString()}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Checks</h2>
        <ul className="space-y-3">
          {status.checks.map((check) => (
            <li
              key={check.id}
              className={`rounded-lg border p-4 ${STATE_STYLES[check.state]}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-medium">{check.label}</span>
                <span className={`text-sm font-semibold ${STATE_TEXT[check.state]}`}>
                  {STATE_LABELS[check.state]}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-300">{check.detail}</p>
              {check.action && (
                <p className="mt-2 text-sm text-gray-400">
                  <span className="font-medium text-gray-300">To fix: </span>
                  {check.action}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Fees</h2>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <dt className="text-sm text-gray-400">List a domain</dt>
            <dd className="mt-1 text-lg font-semibold">{status.fees.listing}</dd>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <dt className="text-sm text-gray-400">Cast a vote</dt>
            <dd className="mt-1 text-lg font-semibold">{status.fees.vote}</dd>
          </div>
        </dl>
        {status.fees.treasury ? (
          <p className="mt-3 break-all text-xs text-gray-500">
            Fees are paid on Kaspa L1 to{' '}
            <span className="font-mono text-gray-400">{status.fees.treasury}</span>. Always
            confirm this address in your wallet before approving a payment.
          </p>
        ) : (
          <p className="mt-3 text-sm text-amber-300">
            No treasury address is configured, so paid actions are disabled.
          </p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Where the data comes from</h2>
        <p className="text-sm text-gray-300">
          {status.source === 'supabase' ? (
            <>
              Listings, votes and categories are served from the database. Ownership is
              always read live from KNS, never from a stored copy — a domain that changes
              hands becomes editable by its new owner immediately.
            </>
          ) : (
            <>
              The database is not configured, so the site cannot serve listings, votes,
              categories, or profile data. Configure Supabase to make directory features
              available.
            </>
          )}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">L1 covenant testnet</h2>
        <p className="text-sm text-gray-300">
          KaspaDomains is preparing an L1 covenant for {status.l1Covenant.network}. It is
          currently {status.l1Covenant.deployment.replace('-', ' ')}, is not the authority for
          any listing, and cannot broadcast a transaction. KNS ownership and current directory
          writes continue to use their existing mainnet-verified paths.
        </p>
      </section>

      <p className="mt-10 text-sm text-gray-500">
        Machine-readable version at{' '}
        <Link href="/api/status" className="text-teal-300 hover:text-teal-200">
          /api/status
        </Link>
        . It answers 503 when a check is failing, so it can drive an uptime monitor.
      </p>
    </main>
  );
}
