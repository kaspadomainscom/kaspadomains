-- 0003_atomic_writes.sql
--
-- Makes every paid write all-or-nothing.
--
-- The problem (Codex SA-08): a listing was an insert into `domains`, then a
-- separate insert into `domain_categories`, with a hand-rolled rollback if the
-- second failed -- and the rollback's own success was never checked while the
-- API told the user nothing had been created. A vote was a receipt claim
-- followed by a separate insert. Between any two of those round trips the
-- network can drop, and the user has already paid.
--
-- A Postgres function runs in a single implicit transaction, so either the
-- receipt is consumed and the rows exist, or nothing happened at all. That is
-- the only place this guarantee can live: no amount of application-side
-- sequencing gets it, because the application cannot be atomic across two HTTP
-- requests to PostgREST.
--
-- Safe to run more than once.

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
