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
```

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

Name it `NNNN_short_description.sql`, make every statement re-runnable, and
apply the same change to `schema.sql` so a fresh project still gets it in one
step. Then update `src/lib/database.types.ts`, or the new column is invisible to
TypeScript and every query that selects it returns `undefined` at runtime
instead of failing to compile.
