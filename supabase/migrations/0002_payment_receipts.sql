-- 0002_payment_receipts.sql
--
-- Adds the global fee-receipt ledger and the ownership/payment columns on
-- `domains` and `votes` that the signed write path depends on.
--
-- Needed on any project created before 2026-09-05. `create table if not exists`
-- in schema.sql skips a table that already exists, columns and all, so
-- re-running schema.sql does NOT add these to an existing `domains` table --
-- this migration is the only thing that will.
--
-- Safe to run more than once.

-- ---------------------------------------------------------------------------
-- Payment receipts: one global ledger of spent fee transactions
-- ---------------------------------------------------------------------------
-- The per-table `payment_tx_id` uniques are separate constraints, so a 200 KAS
-- listing receipt also cleared the 1 KAS vote threshold and could be spent a
-- second time in `votes`. This table's primary key is what actually enforces
-- one receipt, one action, across every route.
create table if not exists public.payment_receipts (
  tx_id        text primary key,
  purpose      text        not null check (purpose in ('list-domain', 'vote')),
  payer        text        not null,
  amount_sompi text        not null,
  created_at   timestamptz not null default now()
);

alter table public.payment_receipts enable row level security;

-- No policy at all, deliberately -- not even read. The rows link a payer address
-- to an action, which is nobody else's business. With RLS on and no policy the
-- publishable key can neither read nor write; only the server's secret key,
-- which bypasses RLS, can touch it.

-- ---------------------------------------------------------------------------
-- Listing provenance
-- ---------------------------------------------------------------------------
-- The Kaspa L1 address that submitted the listing, proven by signature.
alter table public.domains add column if not exists submitted_by text;

-- True once the submitter cryptographically proved control of the key behind
-- the `owner` address. Rows written before 2026-09-05 predate that check;
-- treat those as unverified claims, which is why the default is false.
alter table public.domains
  add column if not exists ownership_verified boolean not null default false;

-- The Kaspa L1 transaction that paid the listing fee.
alter table public.domains add column if not exists payment_tx_id text;
alter table public.domains add column if not exists fee_paid text not null default '0';
alter table public.domains add column if not exists tx_hash text;
alter table public.domains
  add column if not exists updated_at timestamptz not null default now();

-- UNIQUE is what makes a payment single-use within this table. Added
-- separately from the column because `add column ... unique` is not
-- conditional, so it would fail on a second run.
do $$
begin
  alter table public.domains add constraint domains_payment_tx_id_key unique (payment_tx_id);
exception
  when duplicate_table then null;  -- constraint already exists
  when duplicate_object then null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Vote provenance
-- ---------------------------------------------------------------------------
alter table public.votes add column if not exists payment_tx_id text;
alter table public.votes add column if not exists fee_paid text not null default '0';
alter table public.votes add column if not exists tx_hash text;

do $$
begin
  alter table public.votes add constraint votes_payment_tx_id_key unique (payment_tx_id);
exception
  when duplicate_table then null;
  when duplicate_object then null;
end;
$$;

-- ---------------------------------------------------------------------------
-- The vote-count view, with security_invoker
-- ---------------------------------------------------------------------------
-- Without security_invoker a view runs with its owner's permissions and
-- silently bypasses RLS on the tables it reads. Harmless here (both are
-- public-read) but the wrong default to leave in place. Postgres 15+.
create or replace view public.domain_vote_counts
  with (security_invoker = true) as
  select d.id as domain_id, d.domain_hash, d.name, count(v.id) as votes
  from public.domains d
  left join public.votes v on v.domain_id = d.id
  group by d.id, d.domain_hash, d.name;
