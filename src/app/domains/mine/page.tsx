'use client';

import { useWalletContext } from '@/context/WalletContext';
import { usePaginatedDomains } from '@/hooks/kns/api/usePaginatedDomains';
import { DomainCard } from '@/components/DomainCard';
import Loader from '@/components/Loader';
import { useEffect, useState } from 'react';

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

  const domains = data?.domains || [];
  const totalPages = data?.pagination?.totalPages || 1;

  useEffect(() => {
    console.debug('[MyDomainsPage] Wallet status:', status);
    console.debug('[MyDomainsPage] Connected account:', account);
    console.debug('[MyDomainsPage] Domains fetched:', domains);
  }, [status, account, domains]);

  const handlePrev = () => setPage((prev) => Math.max(prev - 1, 1));
  const handleNext = () => setPage((prev) => Math.min(prev + 1, totalPages));

  if (status === 'connecting') {
    return <Loader text="Connecting wallet…" />;
  }

  if (status !== 'connected') {
    return (
      <div className="max-w-2xl mx-auto py-10 text-center text-white">
        <h1 className="text-2xl font-bold mb-4">My Domains</h1>
        <p className="text-lg">Please connect your wallet to view your domains.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold text-white mb-6">My Domains</h1>

      {isLoading && domains.length === 0 && <Loader text="Loading your domains…" />}

      {isError && (
        <p className="text-red-500 text-center mb-4">
          {(error as Error)?.message || 'Failed to load your domains.'}
        </p>
      )}

      {!isLoading && domains.length === 0 && (
        <p className="text-white text-center">You don’t own any domains yet.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
        {domains.map((domain) => (
          <DomainCard key={domain.name} domain={domain} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 text-white">
          <button
            onClick={handlePrev}
            disabled={page === 1 || isFetching}
            className="px-4 py-2 bg-kaspaGreen rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-lg">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={handleNext}
            disabled={page === totalPages || isFetching}
            className="px-4 py-2 bg-kaspaGreen rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
