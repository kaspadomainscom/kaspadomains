// src/lib/topVotedDomains.ts
import { loadCategoriesManifest } from "@/data/categoriesManifest";
import { fetchVoteCounts } from "@/data/supabaseSource";
import type { Domain } from "@/data/types";

export type DomainWithVotes = Domain & { votes: number };

/**
 * Every active listing, deduped, ranked by real vote counts.
 *
 * Listings and vote counts come from the same store, so a ranking can never mix
 * one source's listings with another's counts and reflect neither. That used to
 * be a live risk: the counts had a contract fallback behind them.
 *
 * Throws if either read fails. The callers render that as unknown rather than
 * as an empty ranking.
 */
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

  const counts = await fetchVoteCounts();
  const ranked = domains
    .map((domain) => ({
      ...domain,
      votes: counts.get(domain.domainHash.toString()) ?? 0,
    }))
    .sort((a, b) => b.votes - a.votes);

  return limit ? ranked.slice(0, limit) : ranked;
}
