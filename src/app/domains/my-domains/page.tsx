// src/app/domains/my-domains/page.tsx
"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useWalletContext } from '@/context/WalletContext';
import { usePaginatedDomains, type DomainAsset } from '@/hooks/kns/api/usePaginatedDomains';
import { useListingStatuses, type ListingStatus } from '@/hooks/domains/useListingStatuses';
import Loader from '@/components/Loader';
import { formatKas, LISTING_FEE_SOMPI } from '@/lib/fees';

/**
 * "My Domains" answers two questions that come from two different places, and
 * the page is careful to keep them apart:
 *
 *   * **What do I own?** KNS, keyed by the Kaspa L1 address.
 *   * **What have I listed here?** Supabase, keyed by domain name.
 *
 * The previous version answered the second question with KNS's `listed` field,
 * which means "for sale on the KNS marketplace" -- an entirely different thing.
 * Domains that had never been listed on KaspaDomains were shown as Listed.
 */

const PAGE_SIZE = 12;

function ListedBadge({ status }: { status: ListingStatus | null | undefined }) {
  if (status === undefined) {
    // Not known -- Supabase is unconfigured, still loading, or errored.
    return (
      <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-gray-300">
        Listing status unavailable
      </span>
    );
  }
  if (status === null) {
    return (
      <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-gray-300">
        Not listed
      </span>
    );
  }
  return (
    <span className="rounded-full bg-teal-500/15 px-2.5 py-0.5 text-xs font-medium text-teal-300">
      Listed · {status.votes} {status.votes === 1 ? 'vote' : 'votes'}
    </span>
  );
}

function DomainRow({
  asset,
  status,
}: {
  asset: DomainAsset;
  status: ListingStatus | null | undefined;
}) {
  const name = asset.asset;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="truncate text-lg font-semibold text-white">{name}</span>
        <ListedBadge status={status} />
      </div>

      {asset.creationBlockTime && (
        <span className="text-xs text-gray-400">
          Registered {new Date(asset.creationBlockTime).toLocaleDateString()}
        </span>
      )}

      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        {status ? (
          <>
            <Link
              href={`/domain/${encodeURIComponent(name)}`}
              className="rounded bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/15"
            >
              View
            </Link>
            <Link
              href={`/domain/update/${encodeURIComponent(name)}`}
              className="rounded bg-teal-500/20 px-3 py-1.5 text-sm text-teal-200 hover:bg-teal-500/30"
            >
              Edit profile
            </Link>
          </>
        ) : (
          <Link
            href="/list-domain"
            className="rounded bg-teal-500/20 px-3 py-1.5 text-sm text-teal-200 hover:bg-teal-500/30"
          >
            List for {formatKas(LISTING_FEE_SOMPI)}
          </Link>
        )}
      </div>
    </div>
  );
}

export default function MyDomainsPage() {
  const { kasware } = useWalletContext();
  const account = kasware.account;
  const status = kasware.status;
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, isFetching } = usePaginatedDomains({
    owner: account || '',
    type: 'domain',
    page,
    pageSize: PAGE_SIZE,
  });

  const domains: DomainAsset[] = useMemo(() => data?.domains ?? [], [data]);
  const totalPages = data?.pagination?.totalPages ?? 1;

  const names = useMemo(
    () => domains.map((d) => d.asset).filter((n): n is string => Boolean(n)),
    [domains]
  );

  const {
    statuses,
    isLoading: statusesLoading,
    error: statusesError,
    supported,
  } = useListingStatuses(names);

  if (status === 'connecting') {
    return <Loader text="Connecting wallet…" />;
  }

  if (status !== 'connected') {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center text-white">
        <h1 className="text-2xl font-bold mb-4">My Domains</h1>
        <p className="text-lg text-gray-300">
          {status === 'idle' || status === 'unavailable'
            ? 'Connect your Kasware wallet to see the .kas domains you own.'
            : 'Wallet not detected or unsupported.'}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold text-white mb-2">My Domains</h1>
      <p className="text-gray-400 mb-8">
        The .kas domains this wallet owns on KNS, and whether each one is listed on
        KaspaDomains.
      </p>

      {isLoading && domains.length === 0 && <Loader text="Loading your domains…" />}

      {isError && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-center text-red-300">
          {error?.message ?? 'Failed to load your domains from KNS.'}
        </div>
      )}

      {/* Listing status failing is not the same as the page failing: the
          ownership list above is still correct and worth showing. */}
      {statusesError && (
        <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200">
          Your domains loaded, but their listing status could not be read:{' '}
          {statusesError}
        </div>
      )}

      {!isLoading && !isError && domains.length === 0 && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center text-gray-300">
          This wallet doesn&apos;t own any .kas domains yet.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-10">
        {domains.map((asset) => {
          if (!asset.asset) return null;
          // undefined = unknown, null = confirmed not listed, object = listed.
          const listing =
            !supported || statusesLoading || !statuses
              ? undefined
              : statuses.get(asset.asset.trim().toLowerCase()) ?? null;

          return <DomainRow key={asset.asset} asset={asset} status={listing} />;
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 text-white">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || isFetching}
            className="px-4 py-2 bg-kaspaGreen rounded hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-kaspaGreen/70 disabled:opacity-50"
            aria-label="Previous page"
          >
            Previous
          </button>
          <span className="text-lg">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || isFetching}
            className="px-4 py-2 bg-kaspaGreen rounded hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-kaspaGreen/70 disabled:opacity-50"
            aria-label="Next page"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
