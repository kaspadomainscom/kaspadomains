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
-- Payment receipts
-- ---------------------------------------------------------------------------
-- One global ledger of spent fee transactions. The per-table payment_tx_id
-- constraints are not enough on their own: they are separate uniques, so a
-- single 200 KAS listing receipt also satisfies the 1 KAS vote threshold and
-- could be spent a second time in `votes`. This table is the single place a
-- receipt is claimed, so a transaction can fund exactly one action of any kind.
--
-- Claimed before the action is written and released if that write fails, so a
-- failed listing does not burn the payment.
create table if not exists public.payment_receipts (
  tx_id       text primary key,
  purpose     text        not null check (purpose in ('list-domain', 'vote')),
  payer       text        not null,
  amount_sompi text       not null,
  created_at  timestamptz not null default now()
);

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
--
-- security_invoker makes the view run with the *caller's* permissions rather
-- than the owner's. Without it a view silently bypasses RLS on the tables it
-- reads, which happens to be harmless here (both are public-read) but is the
-- wrong default to establish. Requires Postgres 15+, which Supabase projects
-- created any time recently will be on.
create or replace view public.domain_vote_counts
  with (security_invoker = true) as
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
alter table public.payment_receipts  enable row level security;
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

-- payment_receipts deliberately gets NO policy at all, not even read: the rows
-- link a payer address to an action, which is nobody else's business. With RLS
-- on and no policy, the publishable key can neither read nor write it; only the
-- server's secret key, which bypasses RLS, can touch it.

-- No insert/update/delete policies are defined on purpose. With RLS enabled and
-- no write policy, the anon key cannot write at all; the service-role key
-- bypasses RLS and is only ever used server-side, after the request has been
-- checked (wallet signature + KNS ownership). Do not add a permissive write
-- policy here to "make it work" -- that would let anyone list a domain they do
-- not own.


-- ---------------------------------------------------------------------------
-- Atomic write functions
-- ---------------------------------------------------------------------------
-- Kept identical to supabase/migrations/0003_atomic_writes.sql so a fresh
-- project gets everything from this one file. Change both together.
--
-- Why functions at all: a paid write is a receipt claim plus one or more
-- inserts, and PostgREST cannot make two HTTP requests atomic. Doing it in the
-- application meant a network drop between them left a user paid-but-unlisted.
-- A function runs in a single transaction, so either all of it happened or none
-- of it did.

-- ---------------------------------------------------------------------------
-- Schema version
-- ---------------------------------------------------------------------------
-- Lets the app ask, in one cheap call, whether the functions below actually
-- exist. Without it, deploying this code against a database that has not had
-- this migration applied would fail at the *write* -- which is after the user
-- has paid. The preflight calls this so it can refuse beforehand.
create or replace function public.kaspadomains_schema_version()
  returns integer
  language sql
  immutable
  set search_path = public, pg_temp
as $$ select 3 $$;

-- ---------------------------------------------------------------------------
-- Error codes
-- ---------------------------------------------------------------------------
-- Custom SQLSTATEs so the API can tell these apart without string-matching a
-- message. Class 'KD' is outside the standard classes.
--
--   KD001  the payment receipt has already been used
--   KD002  that domain is already listed
--   KD003  a category is not on the allow-list
--   KD004  that wallet has already voted for that domain
--   KD005  that domain is not listed

-- ---------------------------------------------------------------------------
-- create_listing
-- ---------------------------------------------------------------------------
-- Consumes the receipt, creates the listing and attaches its categories, or
-- does none of those things.
--
-- The receipt is claimed FIRST and inside the same transaction: its primary key
-- is what makes a payment single-use, and only the database can decide that
-- atomically when two requests quote the same payment at once.
create or replace function public.create_listing(
  p_domain_hash   text,
  p_name          text,
  p_owner         text,
  p_submitted_by  text,
  p_fee_paid      text,
  p_payment_tx_id text,
  p_payer         text,
  p_categories    text[]
) returns bigint
  language plpgsql
  security definer
  -- Pinned so a caller cannot shadow `domains` or `categories` with something
  -- of their own. A security definer function without this is a privilege
  -- escalation waiting to happen.
  set search_path = public, pg_temp
as $$
declare
  v_domain_id  bigint;
  v_bad        text;
begin
  if p_categories is null or array_length(p_categories, 1) is null then
    raise exception 'At least one category is required.' using errcode = 'KD003';
  end if;

  -- Every category must exist AND be currently allowed. A foreign key proves
  -- only the first.
  select c into v_bad
  from unnest(p_categories) as c
  where not exists (
    select 1 from public.categories cat where cat.key = c and cat.is_allowed
  )
  limit 1;

  if v_bad is not null then
    raise exception 'Category % is not available.', v_bad using errcode = 'KD003';
  end if;

  begin
    insert into public.payment_receipts (tx_id, purpose, payer, amount_sompi)
    values (p_payment_tx_id, 'list-domain', p_payer, p_fee_paid);
  exception when unique_violation then
    raise exception 'That payment has already been used.' using errcode = 'KD001';
  end;

  begin
    insert into public.domains (
      domain_hash, name, owner, submitted_by,
      ownership_verified, fee_paid, payment_tx_id, is_active
    ) values (
      p_domain_hash, p_name, p_owner, p_submitted_by,
      true, p_fee_paid, p_payment_tx_id, true
    )
    returning id into v_domain_id;
  exception when unique_violation then
    raise exception 'That domain is already listed.' using errcode = 'KD002';
  end;

  -- `distinct` matters: a caller can send the same key twice, and without it a
  -- duplicate raises a primary-key violation *inside the transaction* -- which
  -- would roll back a listing the user has already paid for.
  insert into public.domain_categories (domain_id, category_key)
  select distinct v_domain_id, c from unnest(p_categories) as c;

  return v_domain_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- record_vote
-- ---------------------------------------------------------------------------
create or replace function public.record_vote(
  p_name          text,
  p_voter         text,
  p_fee_paid      text,
  p_payment_tx_id text
) returns bigint
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  v_domain_id bigint;
  v_votes     bigint;
begin
  select id into v_domain_id from public.domains where name = p_name;
  if v_domain_id is null then
    raise exception 'That domain is not listed.' using errcode = 'KD005';
  end if;

  begin
    insert into public.payment_receipts (tx_id, purpose, payer, amount_sompi)
    values (p_payment_tx_id, 'vote', p_voter, p_fee_paid);
  exception when unique_violation then
    raise exception 'That payment has already been used.' using errcode = 'KD001';
  end;

  begin
    insert into public.votes (domain_id, voter, fee_paid, payment_tx_id)
    values (v_domain_id, p_voter, p_fee_paid, p_payment_tx_id);
  exception when unique_violation then
    raise exception 'This wallet has already voted for that domain.' using errcode = 'KD004';
  end;

  select count(*) into v_votes from public.votes where domain_id = v_domain_id;
  return v_votes;
end;
$$;

-- ---------------------------------------------------------------------------
-- replace_domain_categories
-- ---------------------------------------------------------------------------
-- Free to call (no receipt), but still atomic: the previous version added the
-- new rows and then deleted the old ones in two round trips, so a failure
-- between them left a listing in categories the owner had just removed.
create or replace function public.replace_domain_categories(
  p_name       text,
  p_categories text[]
) returns void
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  v_domain_id bigint;
  v_bad       text;
begin
  if p_categories is null or array_length(p_categories, 1) is null then
    raise exception 'At least one category is required.' using errcode = 'KD003';
  end if;

  select id into v_domain_id from public.domains where name = p_name;
  if v_domain_id is null then
    raise exception 'That domain is not listed.' using errcode = 'KD005';
  end if;

  select c into v_bad
  from unnest(p_categories) as c
  where not exists (
    select 1 from public.categories cat where cat.key = c and cat.is_allowed
  )
  limit 1;

  if v_bad is not null then
    raise exception 'Category % is not available.', v_bad using errcode = 'KD003';
  end if;

  delete from public.domain_categories
  where domain_id = v_domain_id and category_key <> all (p_categories);

  insert into public.domain_categories (domain_id, category_key)
  select distinct v_domain_id, c from unnest(p_categories) as c
  on conflict (domain_id, category_key) do nothing;
end;
$$;

-- ---------------------------------------------------------------------------
-- replace_domain_links
-- ---------------------------------------------------------------------------
-- The links editor is a bulk replace done as delete-then-insert. If the insert
-- failed the profile was left empty -- visible and recoverable, but still a
-- destroyed profile. One transaction removes that window entirely.
--
-- Takes jsonb rather than parallel arrays so the name/url/position of a link
-- cannot be misaligned by a caller.
create or replace function public.replace_domain_links(
  p_name  text,
  p_links jsonb
) returns void
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  v_domain_id bigint;
begin
  select id into v_domain_id from public.domains where name = p_name;
  if v_domain_id is null then
    raise exception 'That domain is not listed.' using errcode = 'KD005';
  end if;

  delete from public.domain_links where domain_id = v_domain_id;

  if p_links is not null and jsonb_array_length(p_links) > 0 then
    insert into public.domain_links (domain_id, name, url, position)
    select
      v_domain_id,
      link->>'name',
      link->>'url',
      (ordinality - 1)::integer
    from jsonb_array_elements(p_links) with ordinality as t(link, ordinality);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permissions — READ THIS BEFORE CHANGING ANYTHING ABOVE
-- ---------------------------------------------------------------------------
-- Postgres grants EXECUTE on new functions to PUBLIC by default, and PostgREST
-- exposes every function in the `public` schema as an RPC endpoint. Left alone,
-- that would mean the browser-visible publishable key could call
-- `create_listing` directly -- and because these are `security definer`, they
-- run with the owner's rights and bypass the RLS that is the entire reason
-- anonymous writes are impossible. It would be a hole straight through the
-- authorisation model, opened by the very migration meant to make writes safer.
--
-- So: revoke from everyone, then grant only to the service role, which is the
-- key that never leaves the server and is only used after a request has been
-- verified (signature + KNS ownership + payment).
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.create_listing(text, text, text, text, text, text, text, text[])',
    'public.record_vote(text, text, text, text)',
    'public.replace_domain_categories(text, text[])',
    'public.replace_domain_links(text, jsonb)'
  ] loop
    execute format('revoke all on function %s from public', fn);
    execute format('revoke all on function %s from anon', fn);
    execute format('revoke all on function %s from authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end;
$$;

-- The version probe is the exception: it takes no arguments, touches nothing,
-- and returning a constant to an anonymous caller reveals only which migration
-- has been applied. Readable so the public status page can report it.
grant execute on function public.kaspadomains_schema_version() to public;

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
