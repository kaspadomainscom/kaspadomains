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

### 3. `src/proxy.ts` — three dead CSP entries, one of them the bug you were waiting on

Verified 2026-09-07 against the **live response header** from a running dev server, not from
reading the source. Handing this to you rather than doing it because `proxy.ts` imports from
`kaspaDomainRuntime.ts`, which is yours — and because finding 1 is the decision you parked.

The header served today:

```
connect-src 'self' https://kaspadomains.com https://rpc.kasplextest.xyz
            https://knsdomains.org https://api.knsdomains.org
            https://yfezehzqctrinetvvjns.supabase.co
```

1. **`https://rpc.kasplextest.xyz` is dead.** It comes from
   `LEGACY_KASPLEX_TESTNET.rpcUrl`, which your Done note kept alive on exactly this
   ground — *"`LEGACY_KASPLEX_TESTNET` remains because CSP still uses it"*. The EVM path was
   removed on 2026-09-06 and nothing calls that RPC any more, so the CSP no longer needs it
   and the constant has no remaining consumer. Whether the constant itself should go is your
   call; the allowlist entry should not stay either way.

2. **`https://knsdomains.org` is the wrong host, and it is the same bug that was already
   fixed one line above it.** The app calls `https://api.knsdomains.org` (see
   `KNS_API_BASE_URL`), which is separately allowlisted via `knsApiOrigin`. The bare
   `knsdomains.org` is the marketing site and nothing connects to it. The comment
   immediately above `connect-src` documents finding and removing *precisely* this mistake
   for `https://supabase.com` — the marketing host a client never calls — and the identical
   entry for KNS survived directly underneath. `GAPS.md` closed that question for Supabase
   alone. Classic `MIND.md` #18: the fix went to the instance that was noticed rather than
   to the whole list.

3. **`style-src-attr 'self' 'unsafe-hashes' 'nonce-<n>'` can only ever deny.** None of those
   three tokens permits an inline `style="…"` attribute: `'self'` and nonces do not apply to
   attributes at all, and `'unsafe-hashes'` allows nothing unless accompanied by the hashes
   themselves, of which there are none. The same dead `'unsafe-hashes'` sits in `style-src`.

   **Blocking is the right outcome** — the app has zero `style={{…}}` props, confirmed by
   grep — so this is not a request to loosen it. The directive should just say what it does.
   The one live consequence is that Next's built-in `_global-error.html` (the only file in
   the production output containing inline styles) renders unstyled, i.e. the crash page is
   at its ugliest exactly when something has crashed. Worth a deliberate decision, not a
   silent one. In dev it also emits ~88 console errors per page load from the dev overlay,
   which is enough noise to bury a real one.

While you are in the file: lines 44 and 63 are commented-out earlier versions of the two
style directives, and several entries carry `// 🔄 updated` / `// ✅ if using Google Fonts`
markers from an older pass.

---

**Still yours:**

- the profile-write token/revision races against an applied Supabase schema. This needs a
  disposable database with migration 4 applied; do not copy the SQL into a mock and call
  that proof of the atomic behaviour. It is your code and your migration.
- CI and `package.json` — unchanged, still yours.

---

## In progress

_(nothing claimed — move items here with your name before starting)_

---

## Done

- **Payment decision covered** — extracted to `src/lib/paymentCheck.ts` and covered with
  twelve cases, including the two that were real bugs: a payment not sent by the signer, and
  an unresolvable payer failing rather than being skipped. That completes Claude's part of
  item 2; the profile-write race tests, CI and `package.json` remain yours. Claude,
  2026-09-07.

- **Payment-intent token covered** — the money path was untestable because
  `VerificationError` lived in the module that loads `kaspa-wasm`. Moved it to its own
  dependency-free module (re-exported, no caller changed) and extracted the token crypto to
  `src/lib/paymentIntentToken.ts`. Eight cases, including a forged body swapping a 200 KAS
  listing claim for a 1 KAS vote. Claude, 2026-09-07.
  **This is the second module that needed extracting to be testable**, and the constraint is
  sharper than I first wrote: the runner resolves neither `@/` aliases *nor extensionless
  relative imports*, so a module is only testable if it imports nothing but Node builtins.
  Teaching it tsconfig paths and extension resolution would remove that constraint for the
  whole codebase — `package.json`, so yours, and I think it is the highest-leverage thing
  left in your column.

- **`fetchAllPages` covered** — extracted to `src/lib/paging.ts` (dependency-free) and
  covered with seven cases, including a server cap *below* the page size, which is what the
  original fix got wrong. Claude, 2026-09-07.
  **Worth knowing for your own test work**: the runner strips types but does not resolve
  `@/` aliases, so only dependency-free modules are testable. Teaching it tsconfig paths
  would be a `package.json` change and is yours if you want it — it would make a lot more of
  the app coverable without extraction.

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
