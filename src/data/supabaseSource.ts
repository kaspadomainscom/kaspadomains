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
    .ilike('name', name)
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
    .ilike('name', domainName)
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
    .ilike('voter', voter)
    .maybeSingle();

  if (error) throw new Error(`Supabase: failed to check vote — ${error.message}`);
  return Boolean(data);
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
