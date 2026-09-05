-- KaspaDomains — Supabase schema
--
-- Run this once against a new Supabase project (SQL Editor, or `supabase db push`).
--
-- Design notes:
--   * Column names mirror the on-chain shapes the app already consumes
--     (see src/data/types.ts) so the read layer can swap sources without the
--     pages caring which one answered.
--   * `domain_hash` is the same keccak256-derived uint256 the contracts use,
--     stored as text because it exceeds bigint range. Keep it as the canonical
--     join key so rows stay reconcilable with chain data later.
--   * Row Level Security is ON for every table with public read and NO public
--     write. All writes go through the server using the service-role key, which
--     never reaches the browser. This is deliberate: with listings stored
--     off-chain, an anonymous insert policy would let anyone fabricate a
--     listing for a domain they do not own.

-- ---------------------------------------------------------------------------
-- Listings
-- ---------------------------------------------------------------------------
create table if not exists public.domains (
  id            bigint generated always as identity primary key,
  domain_hash   text        not null unique,
  name          text        not null unique,
  -- The Kaspa L1 address KNS reports as the owner. Authoritative for *who*
  -- owns the name, because it is read from KNS server-side rather than taken
  -- from the request body.
  owner         text        not null,
  fee_paid      text        not null default '0',
  is_active     boolean     not null default true,
  -- The Kaspa L1 address that submitted this listing, proven by signature.
  -- Equal to `owner` for anything written through the API, because the write
  -- path refuses requests from anyone but the owner.
  submitted_by  text,
  -- True once the submitter cryptographically proved control of the key behind
  -- the `owner` address: the signature is verified with the rusty-kaspa WASM
  -- SDK and the address derived from the signing public key must equal the
  -- owner KNS reports. Rows written before 2026-09-05 predate that check and
  -- may be false; treat those as unverified claims.
  ownership_verified boolean not null default false,
  -- The Kaspa L1 transaction that paid the listing fee. UNIQUE is what makes a
  -- payment single-use: without it one 200 KAS transaction could be quoted for
  -- any number of listings. This constraint, not the API, is the real
  -- enforcement -- only the database can decide it atomically under concurrent
  -- requests.
  payment_tx_id text unique,
  -- Set once the same listing is confirmed on-chain, so an off-chain row and
  -- its eventual on-chain counterpart can be reconciled rather than duplicated.
  tx_hash       text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists domains_owner_idx on public.domains (lower(owner));
create index if not exists domains_active_idx on public.domains (is_active);

-- ---------------------------------------------------------------------------
-- Categories, and the many-to-many between them and listings
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  key        text primary key,          -- slug used in URLs, e.g. 'gaming'
  title      text not null,
  is_allowed boolean not null default true,
  sort_order integer not null default 0
);

create table if not exists public.domain_categories (
  domain_id    bigint not null references public.domains (id) on delete cascade,
  category_key text   not null references public.categories (key) on delete cascade,
  primary key (domain_id, category_key)
);

create index if not exists domain_categories_category_idx
  on public.domain_categories (category_key);

-- ---------------------------------------------------------------------------
-- Votes
-- ---------------------------------------------------------------------------
-- One row per (voter, domain). The unique constraint is what enforces
-- "one vote per wallet per domain" now that the contract isn't doing it.
create table if not exists public.votes (
  id         bigint generated always as identity primary key,
  domain_id  bigint      not null references public.domains (id) on delete cascade,
  voter      text        not null,
  -- Same single-use rule as listings: one paid transaction, one vote.
  payment_tx_id text unique,
  fee_paid   text        not null default '0',
  tx_hash    text,
  created_at timestamptz not null default now(),
  unique (domain_id, voter)
);

create index if not exists votes_domain_idx on public.votes (domain_id);

-- Vote counts are derived, never stored, so they cannot drift from the rows.
create or replace view public.domain_vote_counts as
  select d.id as domain_id, d.domain_hash, d.name, count(v.id) as votes
  from public.domains d
  left join public.votes v on v.domain_id = d.id
  group by d.id, d.domain_hash, d.name;

-- ---------------------------------------------------------------------------
-- Per-domain resources (the off-chain equivalent of DomainLinksStorage)
-- ---------------------------------------------------------------------------
create table if not exists public.domain_links (
  id         bigint generated always as identity primary key,
  domain_id  bigint      not null references public.domains (id) on delete cascade,
  name       text        not null,
  url        text        not null,
  position   integer     not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists domain_links_domain_idx on public.domain_links (domain_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.domains           enable row level security;
alter table public.categories        enable row level security;
alter table public.domain_categories enable row level security;
alter table public.votes             enable row level security;
alter table public.domain_links      enable row level security;

-- Public read: everything here is meant to be publicly visible, and the site
-- renders it server-side and in the browser.
drop policy if exists "public read" on public.domains;
create policy "public read" on public.domains for select using (true);

drop policy if exists "public read" on public.categories;
create policy "public read" on public.categories for select using (true);

drop policy if exists "public read" on public.domain_categories;
create policy "public read" on public.domain_categories for select using (true);

drop policy if exists "public read" on public.votes;
create policy "public read" on public.votes for select using (true);

drop policy if exists "public read" on public.domain_links;
create policy "public read" on public.domain_links for select using (true);

-- No insert/update/delete policies are defined on purpose. With RLS enabled and
-- no write policy, the anon key cannot write at all; the service-role key
-- bypasses RLS and is only ever used server-side, after the request has been
-- checked (wallet signature + KNS ownership). Do not add a permissive write
-- policy here to "make it work" -- that would let anyone list a domain they do
-- not own.

-- ---------------------------------------------------------------------------
-- Seed: the category list the UI expects
-- ---------------------------------------------------------------------------
insert into public.categories (key, title, sort_order) values
  ('trending',   'Trending',       0),
  ('999club',    '999 Club',      10),
  ('10kclub',    '10k Club',      20),
  ('100kclub',   '100k Club',     30),
  ('short',      'Short',         40),
  ('realWords',  'Real Words',    50),
  ('brandables', 'Brandables',    60),
  ('business',   'Business',      70),
  ('finance',    'Finance',       80),
  ('gaming',     'Gaming',        90),
  ('tech',       'Tech',         100),
  ('web3',       'Web3',         110),
  ('meme',       'Meme',         120),
  ('characters', 'Characters',   130),
  ('geo',        'Geo',          140),
  ('other',      'Other',        150)
on conflict (key) do nothing;
