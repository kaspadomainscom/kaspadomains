'use client';

import { useWalletContext } from '@/context/WalletContext';
import { usePaginatedDomains } from '@/hooks/kns/api/usePaginatedDomains';
import { DomainCard } from '@/components/DomainCard';
import Loader from '@/components/Loader';

export default function MyDomainsPage() {
  const { account, status } = useWalletContext();

  const {
    data,
    isLoading,
    isError,
    error,
  } = usePaginatedDomains({
    owner: account || '',
    type: 'domain',
    page: 1,
    pageSize: 100,
  });

  const domains = data?.domains || [];

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

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {domains.map(domain => (
          <DomainCard key={domain.name} domain={domain} />
        ))}
      </div>
    </div>
  );
}
