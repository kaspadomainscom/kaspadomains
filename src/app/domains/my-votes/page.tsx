// src/app/domains/my-votes/page.tsx
"use client";

import Link from "next/link";
import { DomainCard } from "@/components/DomainCard";
import Loader from "@/components/Loader";
import { useMyVotes } from "@/hooks/domains/useMyVotes";
import { useWalletContext } from "@/context/WalletContext";
import type { Domain } from "@/data/types";

export default function MyVotesPage() {
  const { kasware } = useWalletContext();
  const { data, isLoading, isError, error } = useMyVotes();

  const connected = kasware.account;

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 text-white">
      <h1 className="text-3xl font-bold mb-2">My Voted Domains</h1>
      <p className="text-gray-400 mb-8">
        Every domain you have voted for, newest first.
      </p>

      {!connected && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center">
          <p className="text-gray-300">
            Connect your Kasware wallet to see the domains you have voted for.
          </p>
        </div>
      )}

      {connected && isLoading && <Loader text="Loading your voted domains…" />}

      {connected && isError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-6 text-center text-red-300">
          <p className="font-medium">Could not load your votes.</p>
          <p className="mt-1 text-sm text-red-300/80">
            {error?.message || "The request failed."}
          </p>
        </div>
      )}

      {/* Only claim "no votes" when a load actually succeeded and returned none. */}
      {connected && !isLoading && !isError && data?.length === 0 && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center">
          <p className="text-gray-300">You haven&apos;t voted for any domains yet.</p>
          <Link
            href="/domains"
            className="mt-3 inline-block text-sm font-medium text-teal-300 hover:text-teal-200"
          >
            Browse domains →
          </Link>
        </div>
      )}

      {connected && !isLoading && !isError && data && data.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {data.map((domain: Domain) => (
            <DomainCard key={domain.name} domain={domain} />
          ))}
        </div>
      )}
    </div>
  );
}
