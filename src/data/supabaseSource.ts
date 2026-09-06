// src/data/supabaseSource.ts
import { getSupabaseReadClient } from '@/lib/supabase';
import type { CategoryManifest } from './categoriesManifest';
import type { Domain } from './types';

/**
 * Supabase-backed reads, returning exactly the shapes the on-chain path
 * returns (see src/data/types.ts and CategoryManifest) so callers never learn
 * which source answered.
 *
 * Every function here throws on failure rather than returning an empty result.
 * An empty category list and a database outage are different answers, and
 * collapsing them is what made the site claim domains didn't exist when the
 * real problem was that nothing had loaded (see docs/MIND.md principles #2
 * and #3).
 */

type DomainRow = {
  id: number;
  domain_hash: string;
  name: string;
  owner: string;
  fee_paid: string;
  is_active: boolean;
  created_at: string;
};

function rowToDomain(row: DomainRow): Domain {
  return {
    id: row.id,
    // Stored as text because a uint256 domain hash overflows bigint.
    domainHash: BigInt(row.domain_hash),
    name: row.name,
    owner: row.owner,
    // The app models createdAt as a unix timestamp in seconds, matching the
    // contract's own representation.
    createdAt: Math.floor(new Date(row.created_at).getTime() / 1000),
    isActive: row.is_active,
    feePaid: row.fee_paid,
  };
}

const DOMAIN_COLUMNS = 'id, domain_hash, name, owner, fee_paid, is_active, created_at';

function requireClient() {
  const client = getSupabaseReadClient();
  if (!client) {
    throw new Error('Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY).');
  }
  return client;
}

/** Every active listing, flat. */
export async function fetchAllDomains(): Promise<Domain[]> {
  const { data, error } = await requireClient()
    .from('domains')
    .select(DOMAIN_COLUMNS)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Supabase: failed to load domains — ${error.message}`);
  return (data ?? []).map(rowToDomain);
}

/** One listing by name, or undefined when it genuinely isn't listed. */
export async function fetchDomainByName(name: string): Promise<Domain | undefined> {
  const { data, error } = await requireClient()
    .from('domains')
    .select(DOMAIN_COLUMNS)
    .eq('name', name.trim().toLowerCase())
    .maybeSingle();

  if (error) throw new Error(`Supabase: failed to look up "${name}" — ${error.message}`);
  return data ? rowToDomain(data as DomainRow) : undefined;
}

/**
 * The category manifest: every allowed category, with its listings.
 *
 * Two queries rather than per-category ones -- the on-chain version's N+1
 * pattern is what made it slow enough to need concurrency limiting.
 */
export async function fetchCategoryManifest(): Promise<CategoryManifest> {
  const client = requireClient();

  const [categoriesResult, membershipResult] = await Promise.all([
    client
      .from('categories')
      .select('key, title')
      .eq('is_allowed', true)
      .order('sort_order', { ascending: true }),
    client
      .from('domain_categories')
      .select(`category_key, domains!inner (${DOMAIN_COLUMNS})`),
  ]);

  if (categoriesResult.error) {
    throw new Error(`Supabase: failed to load categories — ${categoriesResult.error.message}`);
  }
  if (membershipResult.error) {
    throw new Error(
      `Supabase: failed to load category membership — ${membershipResult.error.message}`
    );
  }

  const manifest: CategoryManifest = {};
  for (const category of categoriesResult.data ?? []) {
    manifest[category.key] = { title: category.title, domains: [] };
  }

  for (const row of membershipResult.data ?? []) {
    const bucket = manifest[row.category_key as string];
    if (!bucket) continue; // membership pointing at a disallowed category
    // PostgREST types an embedded to-one join loosely; the !inner join above
    // guarantees exactly one row here.
    const domainRow = row.domains as unknown as DomainRow | null;
    if (!domainRow || !domainRow.is_active) continue;
    bucket.domains.push(rowToDomain(domainRow));
  }

  return manifest;
}

/** Vote count per domain hash, for ranking. */
export async function fetchVoteCounts(): Promise<Map<string, number>> {
  const { data, error } = await requireClient()
    .from('domain_vote_counts')
    .select('domain_hash, votes');

  if (error) throw new Error(`Supabase: failed to load vote counts — ${error.message}`);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(String(row.domain_hash), Number(row.votes) || 0);
  }
  return counts;
}

/** Vote count for a single domain. */
export async function fetchVoteCount(domainName: string): Promise<number> {
  const { data, error } = await requireClient()
    .from('domain_vote_counts')
    .select('votes')
    .eq('name', domainName.trim().toLowerCase())
    .maybeSingle();

  if (error) throw new Error(`Supabase: failed to load votes — ${error.message}`);
  return data ? Number(data.votes) || 0 : 0;
}

/** Whether a wallet has already voted for a domain. */
export async function fetchHasVoted(domainName: string, voter: string): Promise<boolean> {
  const client = requireClient();

  const domain = await fetchDomainByName(domainName);
  if (!domain) return false;

  const { data, error } = await client
    .from('votes')
    .select('id')
    .eq('domain_id', domain.id)
    .eq('voter', voter)
    .maybeSingle();

  if (error) throw new Error(`Supabase: failed to check vote — ${error.message}`);
  return Boolean(data);
}

/** A page of voter addresses, newest first. Replaces reading DomainVoted events. */
export async function fetchVoters(
  domainName: string,
  page: number,
  pageSize: number
): Promise<string[]> {
  const client = requireClient();

  const domain = await fetchDomainByName(domainName);
  if (!domain) return [];

  const from = (page - 1) * pageSize;
  const { data, error } = await client
    .from('votes')
    .select('voter')
    .eq('domain_id', domain.id)
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1);

  if (error) throw new Error(`Supabase: failed to load voters — ${error.message}`);
  return (data ?? []).map((row) => row.voter as string);
}

/** The resources attached to a domain (the off-chain DomainLinksStorage). */
export async function fetchDomainLinks(
  domainName: string
): Promise<{ name: string; url: string }[]> {
  const client = requireClient();

  const domain = await fetchDomainByName(domainName);
  if (!domain) return [];

  const { data, error } = await client
    .from('domain_links')
    .select('name, url, position')
    .eq('domain_id', domain.id)
    .order('position', { ascending: true });

  if (error) throw new Error(`Supabase: failed to load links — ${error.message}`);
  return (data ?? []).map((row) => ({ name: row.name, url: row.url }));
}

/**
 * The domains a wallet has voted for.
 *
 * Keyed by the **Kaspa L1 address**, because that is what the vote route
 * records (`verified.signerAddress`). The on-chain predecessor keyed votes by
 * the Kasplex EVM address, which is a different address belonging to the same
 * person -- so passing the wrong one here silently returns an empty list rather
 * than failing, which is exactly how "My Votes" came to look permanently empty.
 */
export async function fetchVotedDomains(voter: string): Promise<Domain[]> {
  const address = voter.trim();
  if (!address) return [];

  const { data, error } = await requireClient()
    .from('votes')
    .select(`created_at, domains!inner (${DOMAIN_COLUMNS})`)
    .eq('voter', address)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Supabase: failed to load your votes — ${error.message}`);

  const domains: Domain[] = [];
  for (const row of data ?? []) {
    // The !inner join guarantees one row; PostgREST still types it loosely.
    const domainRow = row.domains as unknown as DomainRow | null;
    if (domainRow) domains.push(rowToDomain(domainRow));
  }
  return domains;
}

/**
 * Which of these domain names are listed here, and with how many votes.
 *
 * Used by "My Domains", where the names come from KNS (what the wallet owns)
 * and the listing state comes from us (what has actually been listed on
 * KaspaDomains). Those are genuinely different questions and the page used to
 * conflate them -- it read KNS's *marketplace* `listed` field and labelled it
 * active, so a domain listed for sale elsewhere appeared as listed here.
 *
 * Names not present in the result are simply not listed. Returns a map rather
 * than an array so the caller can look up by name without a nested scan.
 */
export async function fetchListingStatuses(
  names: string[]
): Promise<Map<string, { domain: Domain; votes: number }>> {
  const wanted = Array.from(
    new Set(names.map((n) => n.trim().toLowerCase()).filter(Boolean))
  );
  const statuses = new Map<string, { domain: Domain; votes: number }>();
  if (wanted.length === 0) return statuses;

  const client = requireClient();

  const { data, error } = await client
    .from('domains')
    .select(DOMAIN_COLUMNS)
    .in('name', wanted);

  if (error) throw new Error(`Supabase: failed to load listing status — ${error.message}`);

  const rows = (data ?? []) as DomainRow[];
  if (rows.length === 0) return statuses;

  const { data: countRows, error: countError } = await client
    .from('domain_vote_counts')
    .select('name, votes')
    .in('name', rows.map((row) => row.name));

  if (countError) {
    throw new Error(`Supabase: failed to load vote counts — ${countError.message}`);
  }

  const counts = new Map<string, number>();
  for (const row of countRows ?? []) {
    if (row.name) counts.set(row.name, Number(row.votes) || 0);
  }

  for (const row of rows) {
    statuses.set(row.name, {
      domain: rowToDomain(row),
      votes: counts.get(row.name) ?? 0,
    });
  }

  return statuses;
}

export type DomainCategory = { key: string; title: string; isAllowed: boolean };

/**
 * The categories a listing belongs to, with their display titles.
 *
 * Includes **withdrawn** categories (`isAllowed: false`) rather than filtering
 * them out. That matters: a domain whose only category has been withdrawn still
 * exists, is still paid for, and still has a profile page. Hiding the membership
 * here is what made the profile page 404 a live listing -- it scanned the
 * category manifest, which drops disallowed categories entirely, so a moderation
 * decision about a *category* silently deleted an owner's *page*.
 *
 * Callers that need only the published categories can filter on `isAllowed`.
 */
export async function fetchDomainCategories(
  domainName: string
): Promise<DomainCategory[]> {
  const client = requireClient();

  const domain = await fetchDomainByName(domainName);
  if (!domain) return [];

  const { data, error } = await client
    .from('domain_categories')
    .select('category_key, categories!inner (key, title, is_allowed)')
    .eq('domain_id', domain.id);

  if (error) throw new Error(`Supabase: failed to load categories — ${error.message}`);

  const rows = (data ?? []) as unknown as {
    category_key: string;
    categories: { key: string; title: string; is_allowed: boolean } | null;
  }[];

  return rows
    .filter((row) => row.categories)
    .map((row) => ({
      key: row.categories!.key,
      title: row.categories!.title,
      isAllowed: row.categories!.is_allowed,
    }));
}
