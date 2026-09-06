# Codex — work queue

Last updated: 2026-09-06
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

### 1. Two false claims in the status files — **please take this first**

`resolveDirectorySource` in `kaspaDomainRuntime.ts` still returns `'kasplex-contracts'`
when Supabase is unconfigured, and `/status` still tells users the site "is falling back to
the Kasplex contracts". **There is no fallback** — the contract path was deleted on
2026-09-06 by owner decision. Without a database the site cannot serve listings at all, and
that is what both should say.

Small, and it is user-facing wrong right now, which is why it is first. Both files are
yours; I did not touch them.

### 2. Decide the fate of `src/lib/kasplex.ts` and `src/lib/viemChains.ts`

Both are unreachable since the contract removal (`npm run dead:check` lists them). If your
L1-covenant work still needs `LEGACY_KASPLEX_TESTNET`, keep them and say so here so nobody
proposes deleting them again. If not, delete them.

### 3. The six `src/hooks/kns/api/**` hooks are unreachable

`useAssetStatus`, `useCheckDomainAvailability`, `useDomainOwner`, `useDomainSearch`,
`useVerifiedDomains`, `useVerifyOwnership`. You added `knsApiUrl()` to all of them, so I
assume they are wanted — but nothing imports them, so `dead:check` cannot go green and CI
cannot enforce it. Either wire one up, or mark them intentionally-unwired here and I will
add an allowlist to the script.

### 4. SA-05 — one-time nonce and profile revision

The last open finding from your own audit. The signature covers the body now, but a
byte-identical request can still be replayed inside the five-minute window. Harmless for
listing, voting and payments — the unique constraints absorb it — but **not** for
`update-links`, which delete-and-reinserts, so replaying an older capture rolls a newer
profile back.

Needs a nonce table, an issuing endpoint, a decision on how long an unspent nonce lives, and
a profile revision the request must match. It touches `src/lib/server/**` and
`src/app/api/domains/**`, which are mine — **coordinate before starting** and I will hand
those files over for the duration.

### 5. Silent wallet reconnect

Auto-reconnect calls `eth_requestAccounts`, which **prompts**. Every page load with a
remembered wallet pops an approval dialog, which trains people to approve without reading.
It should use `eth_accounts` and only escalate on an explicit user action. Needs a
silent-reconnect path on `useKaswareWallet`, which is yours.

I removed the EVM half of this on 2026-09-06 — `WalletContext` is one wallet now and no
longer exposes `kasplex`, `signer`, `provider`, `activeWalletType` or `activeError`.

### 6. Extend the test suite you started

`kaspaDomainRuntime.test.ts` is the first test in this repo and it settled the runner
question by making it (`node:test`, no new dependency). Worth covering next, in rough order
of how much they have actually cost us:

- `fetchAllPages` at server caps above *and below* the page size — the first version of that
  fix returned 100 of 10,000 rows and reported success
- `paymentIntent` accept/reject — wrong domain, signer, amount, action, tampered signature,
  forged body
- `normalizeDomainName` idempotence, and that it agrees with what the server stores
- `verifyPayment`'s payer matching

And wire the test script into `.github/workflows/ci.yml`, which is yours.

---

## In progress

- _(Codex)_ — Queue item 4 / SA-05: server-issued nonce plus profile revision for signed profile writes, under the owner's explicit continuation direction and recorded handoff in `AGENTS.md`.






_(nothing claimed — move items here with your name before starting)_

---

## Done

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

Currently: nothing in your column. Recently finished — the EVM contract removal, the
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
