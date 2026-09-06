-- Profile write replay protection
--
-- Links and categories are both bulk replacements. A signed request used to
-- remain valid for five minutes, which meant an old valid body could restore a
-- stale profile after a newer save. A body digest prevents substitution, but it
-- cannot make an old, byte-identical body stop being old.
--
-- This migration gives each profile a monotonic revision and makes a short-lived
-- nonce single-use in the same transaction as the replacement. The nonce is
-- issued only after the API re-verifies current KNS ownership; it is never an
-- anonymous RPC or browser-writable table.
--
-- Safe to run more than once.

-- ---------------------------------------------------------------------------
-- Revision and one-time nonce state
-- ---------------------------------------------------------------------------
alter table public.domains
  add column if not exists profile_revision bigint not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'domains_profile_revision_nonnegative'
      and conrelid = 'public.domains'::regclass
  ) then
    alter table public.domains
      add constraint domains_profile_revision_nonnegative
      check (profile_revision >= 0);
  end if;
end;
$$;

-- One currently valid nonce per signer/action/revision tuple. Keeping an
-- unspent row lets a replay of the *issuance* request return the same nonce
-- instead of invalidating a valid save attempt.
create table if not exists public.profile_write_nonces (
  nonce            uuid primary key,
  domain_id        bigint      not null references public.domains (id) on delete cascade,
  action           text        not null check (action in ('update-links', 'update-categories')),
  signer           text        not null,
  profile_revision bigint      not null check (profile_revision >= 0),
  expires_at       timestamptz not null,
  created_at       timestamptz not null default now(),
  unique (domain_id, action, signer, profile_revision)
);

create index if not exists profile_write_nonces_expires_at_idx
  on public.profile_write_nonces (expires_at);

-- This table is server-only. It contains capabilities bound to a verified
-- owner, so a public policy would turn the nonce into a browser-mintable token.
alter table public.profile_write_nonces enable row level security;

-- ---------------------------------------------------------------------------
-- New replacement signatures
-- ---------------------------------------------------------------------------
-- Drop the old overloads. Leaving them in place would make a later internal
-- caller able to bypass nonce/revision checks merely by using the old argument
-- list, while PostgREST's error message would make that easy to miss.
drop function if exists public.replace_domain_categories(text, text[]);
drop function if exists public.replace_domain_links(text, jsonb);

-- Each function locks the domain row before checking the expected revision.
-- Two distinct valid nonces for the same old revision therefore serialize: the
-- first consumes a nonce and increments the revision; the second sees KD007.
-- Deleting the nonce happens inside this implicit transaction, so any later
-- validation or insert failure rolls the deletion back rather than burning the
-- user's token.
create or replace function public.replace_domain_categories(
  p_name              text,
  p_categories        text[],
  p_nonce             uuid,
  p_expected_revision bigint,
  p_signer            text
) returns bigint
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  v_domain_id       bigint;
  v_revision        bigint;
  v_consumed_nonce  uuid;
  v_new_revision    bigint;
  v_bad             text;
begin
  if p_categories is null or array_length(p_categories, 1) is null then
    raise exception 'At least one category is required.' using errcode = 'KD003';
  end if;

  select id, profile_revision
    into v_domain_id, v_revision
    from public.domains
    where name = p_name
    for update;

  if v_domain_id is null then
    raise exception 'That domain is not listed.' using errcode = 'KD005';
  end if;

  if p_expected_revision is null
     or p_expected_revision < 0
     or v_revision <> p_expected_revision then
    raise exception 'This profile changed in another tab. Reload before saving.' using errcode = 'KD007';
  end if;

  delete from public.profile_write_nonces
    where nonce = p_nonce
      and domain_id = v_domain_id
      and action = 'update-categories'
      and signer = p_signer
      and profile_revision = p_expected_revision
      and expires_at > clock_timestamp()
    returning nonce into v_consumed_nonce;

  if v_consumed_nonce is null then
    raise exception 'This save request expired or was already used. Reload and try again.' using errcode = 'KD006';
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

  update public.domains
  set profile_revision = profile_revision + 1,
      updated_at = now()
  where id = v_domain_id
  returning profile_revision into v_new_revision;

  return v_new_revision;
end;
$$;

create or replace function public.replace_domain_links(
  p_name              text,
  p_links             jsonb,
  p_nonce             uuid,
  p_expected_revision bigint,
  p_signer            text
) returns bigint
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  v_domain_id       bigint;
  v_revision        bigint;
  v_consumed_nonce  uuid;
  v_new_revision    bigint;
begin
  select id, profile_revision
    into v_domain_id, v_revision
    from public.domains
    where name = p_name
    for update;

  if v_domain_id is null then
    raise exception 'That domain is not listed.' using errcode = 'KD005';
  end if;

  if p_expected_revision is null
     or p_expected_revision < 0
     or v_revision <> p_expected_revision then
    raise exception 'This profile changed in another tab. Reload before saving.' using errcode = 'KD007';
  end if;

  delete from public.profile_write_nonces
    where nonce = p_nonce
      and domain_id = v_domain_id
      and action = 'update-links'
      and signer = p_signer
      and profile_revision = p_expected_revision
      and expires_at > clock_timestamp()
    returning nonce into v_consumed_nonce;

  if v_consumed_nonce is null then
    raise exception 'This save request expired or was already used. Reload and try again.' using errcode = 'KD006';
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

  update public.domains
  set profile_revision = profile_revision + 1,
      updated_at = now()
  where id = v_domain_id
  returning profile_revision into v_new_revision;

  return v_new_revision;
end;
$$;

-- ---------------------------------------------------------------------------
-- Schema version and permissions
-- ---------------------------------------------------------------------------
create or replace function public.kaspadomains_schema_version()
  returns integer
  language sql
  immutable
  set search_path = public, pg_temp
as $$ select 4 $$;

-- SECURITY DEFINER bypasses RLS, so these functions may be called only with
-- the service-role key after the route has verified the KNS owner. PostgreSQL
-- otherwise grants EXECUTE to PUBLIC by default.
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.replace_domain_categories(text, text[], uuid, bigint, text)',
    'public.replace_domain_links(text, jsonb, uuid, bigint, text)'
  ] loop
    execute format('revoke all on function %s from public', fn);
    execute format('revoke all on function %s from anon', fn);
    execute format('revoke all on function %s from authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end;
$$;

grant execute on function public.kaspadomains_schema_version() to public;
