'use client';

import { useEffect, useState, useMemo } from 'react';
import { useWalletContext } from '@/context/WalletContext';
import { usePaginatedDomains } from '@/hooks/kns/api/usePaginatedDomains';
import { DomainCard } from '@/components/DomainCard';
import Loader from '@/components/Loader';

export interface DomainAsset {
  id: string;
  assetId: string;
  asset: string;
  owner: string;
  status: string;
  transactionId: string;
  mimeType?: string;
  creationBlockTime?: string;
  isDomain?: boolean;
  isVerifiedDomain?: boolean;
  listed?: {
    transactionId: string;
    blockTime: string;
    seller: string;
    inputIndex: number;
  };
}

interface Domain {
  name: string;
  price: number;
  listed: boolean;
  kaspaLink: string;
  sellerTelegram?: string;
}

function mapDomainAssetToDomain(asset: DomainAsset): Domain {
  return {
    name: asset.asset,
    price: 0, // Placeholder; update if you have price info
    listed: !!asset.listed,
    kaspaLink: `https://kaspa.com/asset/${encodeURIComponent(asset.asset)}`,
    sellerTelegram: undefined,
  };
}

export default function MyDomainsPage() {
  const { account, status } = useWalletContext();
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
  } = usePaginatedDomains({
    owner: account || '',
    type: 'domain',
    page,
    pageSize,
  });

  const domains: DomainAsset[] = useMemo(() => data?.domains ?? [], [data]);
  const totalPages = data?.pagination?.totalPages ?? 1;

  useEffect(() => {
    console.debug('[MyDomainsPage] Wallet status:', status);
    console.debug('[MyDomainsPage] Connected account:', account);
    console.debug('[MyDomainsPage] Domains fetched:', domains);
  }, [status, account, domains]);

  const handlePrev = () => {
    if (page > 1) setPage((prev) => prev - 1);
  };

  const handleNext = () => {
    if (page < totalPages) setPage((prev) => prev + 1);
  };

  if (status === 'connecting') {
    return <Loader text="Connecting wallet…" />;
  }

  if (status !== 'connected') {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center text-white">
        <h1 className="text-2xl font-bold mb-4">My Domains</h1>
        <p className="text-lg">
          {status === 'idle' || status === 'unavailable'
            ? 'Please connect your wallet to view your domains.'
            : 'Wallet not detected or unsupported.'}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold text-white mb-6">My Domains</h1>

      {isLoading && domains.length === 0 && (
        <Loader text="Loading your domains…" />
      )}

      {isError && (
        <div className="text-center text-red-500 mb-6">
          {error?.message ?? 'Failed to load your domains.'}
        </div>
      )}

      {!isLoading && domains.length === 0 && !isError && (
        <div className="text-white text-center mb-6">
          You don’t own any domains yet.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-10">
        {domains.map((domain) => {
          const key = domain.asset || domain.id || crypto.randomUUID();

          if (!domain.asset) {
            console.warn('[MyDomainsPage] Domain missing asset field:', domain);
            return null;
          }

          return <DomainCard key={key} domain={mapDomainAssetToDomain(domain)} />;
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 text-white">
          <button
            onClick={handlePrev}
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
            onClick={handleNext}
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
