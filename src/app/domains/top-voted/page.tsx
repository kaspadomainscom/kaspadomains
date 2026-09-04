// src/app/domains/top-voted/page.tsx
import type { Metadata } from "next";
import { loadTopVotedDomains, type DomainWithVotes } from "@/lib/topVotedDomains";
import { DomainCard } from "@/components/DomainCard";

const TOP_N = 24;

export const metadata: Metadata = {
  title: "Top Voted .kas Domains | KaspaDomains",
  description: "The premium .kas domains the Kaspa community has voted for the most.",
  alternates: {
    canonical: "https://kaspadomains.com/domains/top-voted",
  },
};

export default async function TopVotedPage() {
  let topDomains: DomainWithVotes[] = [];
  let loadError = false;

  try {
    topDomains = await loadTopVotedDomains(TOP_N);
  } catch (err) {
    console.error("Failed to load top voted domains:", err);
    loadError = true;
  }

  return (
    <div className="min-h-screen bg-[#0b1e1d]">
      <div className="max-w-6xl mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold text-white mb-2">Top Voted Domains</h1>
        <p className="text-gray-400 mb-8">
          Ranked by community votes — see{" "}
          <a href="/docs#voting" className="text-kaspaMint hover:underline">
            how voting works
          </a>
          .
        </p>

        {loadError && (
          <p className="text-red-400 text-center py-10">
            Unable to load vote data right now. Please try again later.
          </p>
        )}

        {!loadError && topDomains.length === 0 && (
          <p className="text-gray-400 text-center py-10">
            No votes yet — be the first to support a domain.
          </p>
        )}

        {!loadError && topDomains.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {topDomains.map((domain) => (
              <div key={domain.name} className="relative">
                <span className="absolute -top-2 -right-2 z-10 bg-kaspaMint text-[#0F2F2E] text-xs font-bold px-2 py-1 rounded-full shadow">
                  {domain.votes.toLocaleString()} vote{domain.votes === 1 ? "" : "s"}
                </span>
                <DomainCard domain={domain} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
