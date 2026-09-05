// src/app/domains/my-votes/page.tsx
"use client";

import Link from "next/link";
import { DomainCard } from "@/components/DomainCard";
import Loader from "@/components/Loader";
import { useMyVotes } from "@/hooks/domains/useMyVotes";
import { useWalletContext } from "@/context/WalletContext";
import { useDomainByHash } from "@/hooks/domain/useDomainByHash";
import type { Domain } from "@/data/types";

/**
 * On the chain fallback the hook can only produce a domain hash, so each row
 * still has to be resolved individually. On the Supabase path every field
 * arrives with the vote and this component is never used.
 */
function DomainByHash({ domainHash }: { domainHash: bigint }) {
  const { data, isLoading, isError } = useDomainByHash(domainHash);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-gray-400">
        Loading {domainHash.toString().slice(0, 10)}…
      </div>
    );
  }

  // Say so rather than rendering nothing. A row that vanishes reads as "this
  // vote didn't exist", when the truth is that we couldn't load it.
  if (isError || !data) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200">
        A vote is recorded on-chain for domain{" "}
        <span className="font-mono">{domainHash.toString().slice(0, 12)}…</span>, but its
        details could not be loaded.
      </div>
    );
  }

  return <DomainCard domain={data} />;
}

export default function MyVotesPage() {
  const { kasware, kasplex } = useWalletContext();
  const { data, isLoading, isError, error, source } = useMyVotes();

  // Each source keys votes by a different address, so the prompt has to name
  // the right wallet or the user connects one and still sees nothing.
  const connected = source === "chain" ? kasplex.account : kasware.account;
  const walletName = source === "chain" ? "Kasplex (EVM)" : "Kasware";

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 text-white">
      <h1 className="text-3xl font-bold mb-2">My Voted Domains</h1>
      <p className="text-gray-400 mb-8">
        Every domain you have voted for, newest first.
      </p>

      {!connected && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center">
          <p className="text-gray-300">
            Connect your {walletName} wallet to see the domains you have voted for.
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
          {data.map((domain: Domain) =>
            domain.name ? (
              <DomainCard key={domain.name} domain={domain} />
            ) : (
              <DomainByHash
                key={domain.domainHash.toString()}
                domainHash={domain.domainHash}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
