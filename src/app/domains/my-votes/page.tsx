// Directory: src/app/domains/my-votes/page.tsx
'use client';

import { useMyVotes } from '@/hooks/solidity/useMyVotes';
import { DomainCard } from '@/components/DomainCard';
import Loader from '@/components/Loader';

export default function MyVotesPage() {
  const { data, isLoading, isError, error } = useMyVotes();

  if (isLoading) return <Loader text="Loading your voted domains..." />;
  if (isError) return <div className="text-red-500 text-center py-6">{error?.message || 'Error loading data.'}</div>;

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 text-white">
      <h1 className="text-3xl font-bold mb-6">My Voted Domains</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {data.map((domain) => (
          <DomainCard key={domain.name} domain={domain} />
        ))}
      </div>
    </div>
  );
}