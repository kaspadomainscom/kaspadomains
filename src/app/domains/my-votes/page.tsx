// src/app/domains/my-votes/page.tsx
"use client";

import { DomainCard } from "@/components/DomainCard";
import Loader from "@/components/Loader";
import { useMyVotes } from "@/hooks/domains/useMyVotes";
import { useEffect, useState } from "react";
import { useDomainByHash } from "@/hooks/domain/useDomainByHash";

function DomainFetcher({ domainHash }: { domainHash: bigint }) {
  const { data, isLoading, isError } = useDomainByHash(domainHash);

  if (isLoading) return null;
  if (isError || !data) return null;

  return <DomainCard key={domainHash.toString()} domain={data} />;
}

export default function MyVotesPage() {
  const { data, isLoading, isError, error } = useMyVotes();
  const [hashes, setHashes] = useState<bigint[]>([]);

  useEffect(() => {
    if (data) {
      setHashes(data);
    }
  }, [data]);

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 text-white">
      <h1 className="text-3xl font-bold mb-6">My Voted Domains</h1>

      {isLoading && <Loader text="Loading your voted domains..." />}

      {isError && (
        <div className="text-red-500 text-center py-6">
          {error?.message || "Error loading your votes."}
        </div>
      )}

      {!isLoading && hashes.length === 0 && (
        <p className="text-gray-400 text-center py-4">
          You haven&apos;t voted for any domains yet.
        </p>
      )}

      {!isLoading && hashes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {hashes.map((hash) => (
            <DomainFetcher key={hash.toString()} domainHash={hash} />
          ))}
        </div>
      )}
    </div>
  );
}
