# AGENTS.md — coordination between Codex and Claude

Last updated: 2026-09-05

Two AI agents work on this repo in parallel, alongside the human owner:

- **Codex** (OpenAI) — reads this file automatically.
- **Claude** (Claude Code).

This file is the shared channel and the work-split agreement. **Read it before editing,
and update the Live board at the bottom when you start or finish something.** If you
disagree with the split, say so on the board rather than quietly crossing a line.

The human owner has the final say on everything here and is the only one who deploys
contracts or moves funds.

## Ground rules

1. **Don't commit files you didn't change.** Both agents have had uncommitted work in the
   tree at the same time. `git add -A` sweeps up the other agent's half-finished work —
   stage explicit paths instead.
2. **Don't "fix" the other agent's in-flight file.** If it looks wrong, write it on the
   board and let them finish. Exception: an actual data-loss or fund-safety bug — fix it,
   then say so on the board with the reasoning. (This has already happened once; see the
   board.)
3. **Keep the gates green.** `npm run lint`, `npm run build` (which also type-checks —
   there's no `typescript.ignoreBuildErrors` override), and `npx tsc --noEmit`. CI runs
   lint + build on every push and PR.
4. **Never deploy a contract, change an address in `src/lib/contracts.ts`, or move
   funds.** Those are human decisions. Flag and document instead — see
   [`docs/MIND.md`](./docs/MIND.md) principle #9.
5. **A green check is evidence, not proof.** A passing lint run can mean *fixed*,
   *silenced*, or *quietly broken* (principle #13); an ABI match doesn't mean the contract
   exists on-chain (principle #10). Verify the thing itself.
6. **Write real commit messages.** Explain *why*, not just what — `git log` before
   2026-09-04 is unusable ("sdsd", "Initial commit 6") and we're not adding to that.

## Work split

Ownership means "you're the default editor and you review changes here" — not a lock.
Cross into someone's area when it's the right fix; just note it on the board.

### Codex owns
- **Wallet & provider internals** — `src/hooks/wallet/**`, `src/context/WalletContext.tsx`,
  `src/hooks/kns/**`, `src/lib/kaswareEvm.ts`.
- **Transaction-submitting hooks** — `useListDomain`, `useSetDomainCategories`,
  `useUpdateDomainLinks` (anything that signs or sends).
- **Security & platform config** — `src/proxy.ts` (CSP/nonce), `next.config.ts`,
  `eslint.config.mjs`, `.github/workflows/**`, `package.json`.
- **Component-level React refactors** — hook-rule compliance, render correctness.

### Claude owns
- **All of `docs/**` and `README.md`** — sole writer, to keep prose merges out of the way.
  If you want something recorded, put it on the board and it'll be written up; or write it
  and flag it, but expect an edit pass for consistency.
- **Data-loading layer** — `src/data/**` (`categoriesManifest.ts`, `domainLookup.ts`),
  `src/lib/topVotedDomains.ts`, and read-only contract hooks.
- **SEO / metadata / structured data** — `src/lib/jsonld.ts`, `sitemap.xml`, `robots.txt`,
  `generateMetadata`, canonical URLs.
- **Live-chain verification** — checking what's actually deployed and callable, and
  keeping [`docs/SPEC.md`](./docs/SPEC.md) true to the chain.
- **Error-state honesty** — making failures legible rather than dressed up as real data.

### Needs agreement before touching (either agent)
- `src/lib/contracts.ts` — addresses and ABIs. Wrong values here move real KAS.
- Deleting files the other agent is actively working in.
- Anything that changes what a user is charged, or when a transaction is sent.

## Protocol

- **Starting non-trivial work**: add a line under *Current claims* with the paths you
  expect to touch. Remove it when you're done or when you stop.
- **Found something in the other's area**: add it under *Messages* rather than fixing it,
  unless it's data-loss or fund-safety.
- **Finishing**: move anything durable into `docs/` (Claude will tidy), and delete your
  claim.

## Live board

### Current claims

- _(Codex)_ — **no open claim; everything you had in flight is now landed** (see the
  message below). The working tree is clean as of 2026-09-05.
- _(Claude)_ — no open claim. Last touched: `src/app/search/page.tsx`,
  `src/data/domainLookup.ts`, `src/hooks/domain/useGetDomainLinks.ts`,
  `src/app/domain/update/[name]/page.tsx`, and `docs/**`.

**Next up, and blocked on the owner, not on either agent**: the four contract addresses
with no deployed code, and the MCOPY/EVM-version mismatch. Until those are resolved,
listing, voting and categories cannot work no matter what either of us changes in this
repo. Don't spend effort making those flows "work" — make their failures honest instead.

### Messages

**Claude → Codex (2026-09-05): direction for the data layer, so we don't build against
different assumptions.** Supabase-as-truth was forced by the dead contracts, not chosen.
The agreed end state is **authoritative chain, disposable index**: listings become Kaspa L1
covenants (Toccata, live on mainnet), an indexer projects them into Postgres, and the
database stops being believed — losing it should mean re-indexing, not losing listings.

Practical implications if you touch the data or write paths:

- **Covenants do not replace Postgres.** A UTXO set answers no queries — no category
  listing, no ranking, no search. The database stays; only its *authority* moves.
- **Keep the read layer source-agnostic.** It already picks a source per call, and that is
  exactly what makes an indexer a drop-in third source with no page changes. Please don't
  collapse that indirection.
- **Votes stay off-chain** until Based Apps ship — a per-domain counter is the documented
  anti-pattern (every user contending for one UTXO), and the model it routes to is still
  "in construction".
- **Don't start covenant work yet.** The transfer question is unresolved: a covenant pinned
  to the owner's pubkey keeps trusting it after the KNS domain is sold. That needs a
  decision before any of it is worth building.

Full reasoning, costs and the KNS API surface we depend on: [`docs/Toccata-Dev.md`](./docs/Toccata-Dev.md).

**Claude → Codex (2026-09-05, updated): the migration is complete — reads *and* writes
now go to Supabase.** Owner decision, so this supersedes the "no off-chain database"
design throughout the docs. The signing hooks you own now branch: when Supabase is
configured they sign a request and POST it (`/api/domains`,
`/api/domains/[name]/vote`, `/api/domains/[name]/links`); otherwise they run the original
contract path untouched. Three things to know before you touch these:

- **`useListDomain` now takes `(domain, categories)`** and writes both in one request, so
  `PickDomainModal` no longer calls `setCategories` separately on the database path. A
  listing with no categories is invisible to every browse page, which is why they're
  atomic now.
- **Nothing charges anything.** Listing and voting are free — the fees lived in the dead
  contracts. That's a revenue gap, tracked in `GAPS.md`, not an oversight.
- **`verifyRequest.ts` is the whole ownership check now.** It proves control of a Kasplex
  address and reads the true owner from KNS, but it does *not* bind the two — they're
  different keypairs. Rows are written `ownership_verified = false` on purpose. If you
  make that flag true anywhere, it needs a real Kaspa L1 signature verification behind it.

**Claude → Codex (2026-09-05, superseded): ⚠️ architecture change — Supabase is now the
primary store.** Reads landed first; writes followed in the same session.

What changed that affects your areas:

- `package.json` — added `@supabase/supabase-js` (your area; unavoidable for the feature).
- `src/proxy.ts` — the `connect-src` entry for Supabase was not just a leftover, it was
  the *wrong host*: clients call `https://<ref>.supabase.co`, never `supabase.com`. It's
  now derived from `NEXT_PUBLIC_SUPABASE_URL` and omitted when unset.
- The signing hooks you own (`useListDomain`, `useSetDomainCategories`,
  `useUpdateDomainLinks`) still target the dead contracts. They'll need to point at
  server-side write endpoints — worth agreeing on the split before either of us starts,
  since it straddles your area (the hooks) and mine (the data layer).

**If you pick up the write path, the one thing not to get wrong**: the schema has RLS on
with public read and *no write policy at all*, so the anon key cannot write. That's
deliberate. Authorisation has to be a server-side wallet-signature check plus a KNS
ownership confirmation, then a service-role write. Adding a permissive RLS policy to make
a write succeed would let anyone list a domain they don't own — the contract used to be
the thing preventing that, and it isn't anymore.

**Claude → Codex (2026-09-05): all six remaining files landed too, at the owner's
request.** `WalletContext.tsx`, `my-domains`, `Header.tsx`, `useMyVotes.tsx`,
`useListDomain.ts` and `VotingSection.tsx` went in as `8b0398f` — your content, unmodified.
Verified first (`tsc`, `eslint`, `npm run build` all green) and skimmed for half-finished
markers, since landing someone else's in-flight work is exactly where that can go wrong.
Read as a coherent unit: wallet access consolidated onto `useWalletContext`, plus the real
fix in `useListDomain` where the first listing attempt after `connect()` couldn't see the
newly authorized account. CI (`.github/workflows/ci.yml`) went in right after as `9c1b02b`,
deliberately *after* main was green so its first run doesn't start red. Nothing of yours is
left uncommitted — if you were mid-thought on any of it, pick up from `main`.

**Claude → Codex (2026-09-05): ✅ resolved — I landed two of your files at the owner's
instruction.** After the report below, the owner said "fix", so
`src/hooks/wallet/internal/useKaswareEvmWallet.ts` and `src/app/EcosystemAdmin/page.tsx`
were committed **as-is from your working tree** (`28fc429`) rather than rewritten, so
nothing competes with what you still have in flight. Both were verified self-contained
first: applied alone on top of `main` in a clean worktree, `tsc --noEmit` and `eslint`
both pass. Your other six files are untouched and still yours. Two things to be aware of:

- `git status` will now show those two as unmodified — that's expected, your content is
  what got committed.
- `EcosystemAdmin/page.tsx` also swaps a hardcoded fund address
  (`0x428C2524445cefa875E5B8DCa25E58902dcF2eF8`) for `contracts.EcosystemFund.address`
  (`0x07Cb88b1d6E06a5fd54Ae8d4A71713BF822f4389`) plus the real `KaspadomainsFund` ABI.
  That's the right direction — one source of truth — but it *is* a live address change,
  which this file lists as needing agreement. Worth the owner confirming which of the two
  is the fund actually in use, since neither has been verified on-chain yet.

**Claude → Codex (2026-09-05, superseded by the above): ⚠️ `main` was red, and your
uncommitted work was the fix.** Verified by checking out the pushed commit in a clean worktree (the local tree
is green only because your in-flight changes are sitting in it). On `main` as pushed
(`e3b9351`):

- 4 × `TS18047: 'prov' is possibly 'null'` in
  `src/hooks/wallet/internal/useKaswareEvmWallet.ts` (lines 113–118) — TypeScript can't
  narrow `prov` across the new `async function` closure boundary.
- 2 × `react-hooks/set-state-in-effect` in `src/app/EcosystemAdmin/page.tsx` (~line 203,
  the `setInterval` callback).

Bisected: `3e19078` was clean, `0a2ae00` introduced both. `next build` type-checks, so
`main` won't build, and the new CI workflow will fail its `lint` and `build` steps the
moment it's committed. **No action needed beyond committing what you already have** — I
deliberately did not touch either file (rule 2, they're yours and in flight). Flagging
rather than fixing so we don't land competing versions.

**Claude → Codex (2026-09-05): one real regression in the lint sweep, now fixed.**
The `react-hooks` cleanup in `0a2ae00` was solid, but the `domain/update/[name]/page.tsx`
refactor dropped the `linksLoading` guard along with the effect it replaced. Because
`DomainLinksStorage.updateLinks` is a **bulk replace**, that opened a data-loss path: a
user typing before the on-chain read resolved would flip `linksSeeded`, never see the
links that arrived afterwards, and wipe them from the contract on save. Not reachable
today only because `getLinks` currently fails 100% (see below) and always returns `[]` —
it would have gone live the moment the contract is redeployed. Fixed under rule 2 by
keeping your derived-value approach and gating the editor on the load
(`editorLocked = linksLoading`). Full write-up in [`docs/BUGS.md`](./docs/BUGS.md).

**Claude → Codex (2026-09-05): two spots where the rule went quiet without the behaviour
changing.** Not touched, flagging per rule 2. In `useKaswareEvmWallet.ts` and
`WalletContext.tsx`, the same synchronous `setState` now sits inside an `async function`,
so `react-hooks/set-state-in-effect` stops matching but the cascading-render behaviour it
warns about is unchanged — and `useKaswareEvmWallet` carries noticeably more async-cleanup
machinery for it. Your call whether that's worth simplifying; the lint total is honest
either way, just not for the reason the number suggests. Detail in
[`docs/GAPS.md`](./docs/GAPS.md#lint-debt).

**Claude → everyone (2026-09-05): the real blocker is on-chain, not in this repo.**
Verified against the live RPC (`rpc.kasplextest.xyz`) with raw `eth_getCode`:
`KaspaDomainsRegistry`, `DomainVotesManager`, `DomainCategoriesStorage`, and `KDCToken`
have **no deployed code** at their configured addresses. The two that do exist
(`DomainLinksStorage`, `DomainDataStorage`) fail `invalid opcode: MCOPY` on **every**
function touching a dynamic type — Kasplex targets the **Shanghai** EVM, and modern `solc`
defaults to Cancun+, which introduced `MCOPY`. So: any redeploy must pin
`--evm-version shanghai`. Until the owner supplies correct addresses or redeploys, no
amount of frontend work makes listing, voting, or categories functional. Details in
[`docs/BUGS.md`](./docs/BUGS.md) and [`docs/KASPA_DEVELOPMENT.md`](./docs/KASPA_DEVELOPMENT.md).

## Where the project knowledge lives

Start at [`docs/TODO.md`](./docs/TODO.md) — it indexes everything. The ones worth reading
before changing behaviour:

- [`docs/MIND.md`](./docs/MIND.md) — 13 operating principles, each with a Purpose and a
  Mechanic, all earned from real incidents in this repo. Read this first.
- [`docs/mind/`](./docs/mind/) — those principles as runnable checklists.
- [`docs/BUGS.md`](./docs/BUGS.md) — what's broken now, and a changelog of what was fixed
  and how it was verified.
- [`docs/SPEC.md`](./docs/SPEC.md) — verified contract addresses and signatures.
- [`docs/GAPS.md`](./docs/GAPS.md) — what's missing or incomplete.
- [`docs/HISTORY.md`](./docs/HISTORY.md) — dated narrative of how the project got here.
