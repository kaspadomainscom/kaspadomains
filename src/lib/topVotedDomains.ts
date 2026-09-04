// src/lib/topVotedDomains.ts
import { loadCategoriesManifest } from "@/data/categoriesManifest";
import { contracts } from "@/lib/contracts";
import { kasplexClient } from "@/lib/viemClient";
import type { Domain } from "@/data/types";

export type DomainWithVotes = Domain & { votes: number };

// Loads all active listed domains, deduped, with real vote counts from a single
// batched on-chain call -- used anywhere the site shows "trending"/"top voted"
// domains, so that data is never fabricated.
export async function loadTopVotedDomains(limit?: number): Promise<DomainWithVotes[]> {
  const manifest = await loadCategoriesManifest();

  const seen = new Set<string>();
  const domains: Domain[] = [];
  for (const category of Object.values(manifest)) {
    for (const domain of category.domains) {
      if (!domain.isActive || seen.has(domain.name)) continue;
      seen.add(domain.name);
      domains.push(domain);
    }
  }

  if (domains.length === 0) return [];

  const votes = (await kasplexClient.readContract({
    address: contracts.DomainVotesManager.address,
    abi: contracts.DomainVotesManager.abi,
    functionName: "getTopVotedDomains",
    args: [domains.map((d) => d.domainHash)],
  })) as readonly bigint[];

  const ranked = domains
    .map((domain, i) => ({ ...domain, votes: Number(votes[i] ?? BigInt(0)) }))
    .sort((a, b) => b.votes - a.votes);

  return limit ? ranked.slice(0, limit) : ranked;
}
