// Directory: src/app/domains/top-voted/page.tsx
'use client';

import { useTopVotedDomains } from '@/hooks/contracts/useTopVotedDomains';
import { DomainCard } from '@/components/DomainCard';
import Loader from '@/components/Loader';

export default function TopVotedPage() {
  const { data, isLoading, isError, error } = useTopVotedDomains();

  if (isLoading) return <Loader text="Loading top voted domains..." />;
  if (isError) return <div className="text-red-500 text-center py-6">{error?.message || 'Error loading data.'}</div>;

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 text-white">
      <h1 className="text-3xl font-bold mb-6">Top Voted Domains</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {data.map((domain) => (
          <DomainCard key={domain.name} domain={domain} />
        ))}
      </div>
    </div>
  );
} 
