# Migrations

`../schema.sql` creates the schema from nothing and is safe to re-run: every
statement in it is `if not exists`, `or replace`, or `on conflict do nothing`.

That idempotence has one hole, and it is the reason this directory exists.
`create table if not exists` skips the **whole table** when it already exists —
including any column added to it since. So on a project that was set up against
an older `schema.sql`, re-running the current one adds new *tables* but silently
misses new *columns*, and the app then fails at runtime against a schema that
looked like it applied cleanly.

Each file here is a forward step written to be safe to run more than once
(`add column if not exists`, `drop policy if exists`). Run them in filename
order; running one twice is a no-op.

## Applying them

Paste the file into the Supabase SQL Editor, or:

```bash
psql "$DATABASE_URL" -f supabase/migrations/0002_payment_receipts.sql
psql "$DATABASE_URL" -f supabase/migrations/0003_atomic_writes.sql
psql "$DATABASE_URL" -f supabase/migrations/20260906201516_profile_replay_protection.sql
```

`0003` adds the `security definer` functions that make paid writes atomic. **Read its
permissions block before editing anything in it** — Postgres grants `EXECUTE` to `PUBLIC`
by default and PostgREST exposes every `public`-schema function as an RPC, so a function
added there without the revokes is callable by the browser-visible key and bypasses RLS.

Then confirm what actually landed:

```bash
npm run db:check
```

## Which do I need?

| Situation | Do this |
|---|---|
| New, empty project | Run `schema.sql` only. It already contains everything here. |
| Project created before 2026-09-05 | Run every migration in order. |
| Not sure | Run `npm run db:check` — it names the missing tables and columns. |

## Adding one

Create it with `supabase migration new short_description` so the CLI assigns a sortable
timestamp filename. Make every statement re-runnable, and apply the same change to
`schema.sql` so a fresh project still gets it in one step. Then update
`src/lib/database.types.ts`, or the new column is invisible to TypeScript and every query
that selects it returns `undefined` at runtime instead of failing to compile.

If the migration adds or changes a `security definer` function, update its revoke/grant
block and the admin **and** anonymous probes in `scripts/db-check.mjs` in the same change.
An anonymous `PGRST202` proves neither that the function is safely hidden nor that it exists;
the admin probe has to establish the latter first.
