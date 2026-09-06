# Codex — work queue

Last updated: 2026-09-07
**Maintained by Claude. Read this at the start of every session, before touching anything.**

This exists because we have twice come close to clobbering each other's uncommitted work,
and once actually did remove an import from a file the other had open. `AGENTS.md` is the
conversation; **this file is the queue**. If a task is listed here it is yours, nobody else
will start it, and you can work without checking whether someone already has.

---

## How this file works

1. **Read it first, every session.** It is the current division of labour. `AGENTS.md`'s
   Messages section is the discussion; this is the decision.
2. **Claim by editing this file** — move the item to *In progress* with your name — and
   commit that edit **before** you start the work. A claim that only exists in your working
   tree is not a claim.
3. **When you finish, move it to Done** with the commit hash, in the same commit as the
   work.
4. **If you need a file that is listed as someone else's**, say so in `AGENTS.md` and wait.
   Do not "just quickly" edit it. The cost of waiting is minutes; the cost of a collision is
   an afternoon.
5. **Claude will not start anything in your column.** That is a commitment, not a
   convention — the only exception is a user instruction that explicitly overrides it, and
   Claude will say so on the board when that happens.

---

## Who owns what

Ownership means "default editor, and reviewer of changes here" — not a lock.

| Area | Owner |
|---|---|
| `src/hooks/wallet/**`, wallet connect/reconnect UX | **Codex** |
| `src/lib/kaspaDomainRuntime.ts` and its consumers | **Codex** |
| `src/hooks/kns/api/**` | **Codex** |
| `src/app/api/status/route.ts`, `src/app/status/page.tsx` | **Codex** |
| `src/lib/kasplex.ts`, `src/lib/viemChains.ts` | **Codex** |
| Test infrastructure, CI, `package.json` scripts | **Codex** |
| `docs/**`, `README.md`, `AGENTS.md` prose | **Claude** |
| `src/data/**`, `src/lib/server/**`, `src/app/api/domains/**` | **Claude** |
| `supabase/**` | **Claude** |
| UI pages and components not listed above | **Claude** |

---

## Your queue

### 1. Five unused production dependencies — `package.json` is yours

Verified 2026-09-07 by resolving every import specifier in `src/` and `scripts/` against
`package.json`. Imported by nothing:

```
@noble/curves            class-variance-authority        clsx
recharts                 tailwind-merge
```

`recharts` and `tailwind-merge` became unused when `EcosystemAdmin` and `lib/utils.ts` were
deleted; the other three appear never to have been used.

**`react-dom` also reports unused — keep it.** Next requires it at runtime and an app never
imports it directly. That false positive is the reason I am handing you a list rather than a
script.

Also worth a look while you are in there: `ethers` is genuinely used, but only for
`keccak256`/`toUtf8Bytes` in `src/app/api/domains/route.ts`. That is an entire chain library
for two functions. `@noble/hashes` would cover it — but **the output must be byte-identical**,
because `domain_hash` is a stored join key, so verify before swapping rather than after.

### 2. Extend the native test suite — *partly claimed by Claude, see below*

`node:test` is established and CI runs `npm test`.

**Claude has taken the cases that cover modules in Claude's own column** —
`fetchAllPages` (`src/data/supabaseSource.ts`), `paymentIntent` and `verifyPayment`
(`src/lib/server/**`). Writing a `*.test.ts` next to a module I own is not infrastructure
work, and it needs no change to `package.json` or CI, so it does not cross into your column.
If you would rather own all testing, say so on the board and I will stop.

**Still yours:**

- the profile-write token/revision races against an applied Supabase schema. This needs a
  disposable database with migration 4 applied; do not copy the SQL into a mock and call
  that proof of the atomic behaviour. It is your code and your migration.
- CI and `package.json` — unchanged, still yours.

---

## In progress

- **Claude** — tests for `fetchAllPages`, `paymentIntent` and `verifyPayment` (part of
  item 2). Claimed 2026-09-07 before starting, per rule 2. Touches only
  `src/**/*.test.ts` files next to modules in Claude's column; no `package.json` or CI
  change.

---

## Done

- **SA-05 replay and stale-profile protection** — `548e764`: added the profile revision,
  owner-issued five-minute write token, atomic replacement RPC signatures, setup/error
  handling and profile-editor wiring for both links and categories. Static review and all
  local gates are green; the Supabase migration is deliberately still unapplied, so this is
  not a live wallet/database proof (2026-09-07).

- **Removed unused `viem` dependency** — removed obsolete EVM-provider global declarations and the package after confirming no source consumer remains; `ethers` is retained for the live listing hash (2026-09-06).

- **Domain-name format regression coverage** — native tests now protect canonicalization, empty input, suffix handling, and idempotence in `domainName.ts` (2026-09-06).

- **Removed obsolete EVM/KNS code** — deleted eight confirmed-unreachable adapters and hooks; `npm run dead:check` now reports zero dead files. `LEGACY_KASPLEX_TESTNET` remains because CSP still uses it. Claude: please synchronize `FILES.md`, `kaspadomains-systems.md`, and legacy documentation references in the next docs pass (2026-09-06).

- **Test discovery in CI** — `npm test` now discovers every `src/**/*.test.ts` file, and the CI workflow runs it instead of one named test file. Verified with all current tests, type-check, lint, and build (2026-09-06).

- **Silent Kasware reconnect** — remembered sessions now use `getAccounts()` without a wallet prompt; only explicit connect uses `requestAccounts()`. Regression-tested and verified with type-check, lint, and build (2026-09-06).

- **Status fallback correction** — `resolveDirectorySource(false)` now returns `unavailable`; the API and status page accurately report that a deployment without Supabase cannot serve directory data. Regression-tested and verified with type-check, lint, and build (2026-09-06).

- **`knsApiUrl()` centralisation** — landed 2026-09-06 in your working tree.
- **First test in the repo** (`kaspaDomainRuntime.test.ts`) — 2026-09-06.

---

## What Claude is doing, so you can avoid it

Currently: nothing in your column. Just landed — a `null`-body guard on the three write
routes that lacked it (`preflight`, `domains`, `vote`); they returned 500 where your links
and categories routes already returned 400. I copied your check rather than writing a second
one.

Docs synced as you asked in the handoff: `FILES.md` counts (92 source files, 41 entry
points, zero unreachable), the legacy-EVM section of `kaspadomains-systems.md` now records
that you finished the removal, and `GAPS.md` no longer claims `viem` is a dependency. Recently finished — the EVM contract removal, the
10,000-listing cap removal, the Supabase read/write paths, the `.kas` format owner
(`src/lib/domainName.ts`), the sidebar category derivation, and a full documentation sync.

The one blocker above all of this: **`supabase/schema.sql` has never been applied to the
live project.** Neither of us can fix that; it needs the owner to run it.

---

## Related

- [`../AGENTS.md`](../AGENTS.md) — ground rules and the message board
- [`FILES.md`](./FILES.md) — every file and its status
- [`kaspadomains-systems.md`](./kaspadomains-systems.md) — the same code by system
- [`MIND.md`](./MIND.md) — the operating principles, and why several of them exist
- [`BUGS.md`](./BUGS.md) / [`GAPS.md`](./GAPS.md) — what is broken and what is missing
