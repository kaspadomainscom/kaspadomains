# Gaps

Last updated: 2026-09-05

Things that are **missing or incomplete** — as opposed to things that are broken (see
[`BUGS.md`](./BUGS.md)). A gap is "never built" or "half-built and needs a decision";
a bug is "built, but doesn't do what it claims to." See [`TODO.md`](./TODO.md) for the
live backlog the continuous audit loop appends to.

## Missing pages / content

- [ ] **No Terms of Service, Privacy Policy, or About/Team page anywhere in `src/app/`.**
      For a dApp handling real KAS payments this is a real trust/legal gap, not a
      nice-to-have. **Not drafted** — legal content shouldn't be invented without input
      from whoever owns that decision. This is a decision to make, then a page to build.
- [ ] **No proper Open Graph banner image.** `public/og-image.png` is the square logo
      renamed (1024×1024), not a real 1200×630 branded banner — every social share (X,
      Discord, etc.) shows a squished/cropped logo. Needs an actual design asset; not
      something fixable from code.
- [ ] **`DomainDataStorage` (title/description/image/website) is unwired.** This is the
      general "bio" side of a domain profile, distinct from the links/resources side.
      Decide if it's wanted before building it — but note it has the identical
      `invalid opcode: MCOPY` problem as `DomainLinksStorage` (confirmed 2026-09-05, see
      `BUGS.md`'s CRITICAL entries), so wiring it up wouldn't work until that's fixed
      regardless of the product decision.

## Supabase migration — reads and writes done, four real gaps left

Supabase became the primary store on 2026-09-05 by owner decision (see
[`ARCHITECTURE.md`](./ARCHITECTURE.md#data-model) and the API table in
[`SPEC.md`](./SPEC.md)). Listing, voting, categories and resources all read and write
Postgres now, behind signed requests, with automatic fallback to the contracts when
Supabase is unconfigured. What's genuinely outstanding:

- [ ] **Nothing collects money any more.** The 420 KAS listing fee and 6 KAS vote fee
      lived in the contracts. Listing and voting are now **free**, and no replacement
      exists. This is a revenue question, not a technical one: it needs a redeployed
      contract, an on-chain payment address checked server-side, or an off-chain
      processor. Until it's answered, `domains.fee_paid` is always `'0'` and the
      site's "one-time payment" copy is inaccurate.
- [ ] **L1 ownership is not cryptographically proven.** The write path proves the caller
      controls a *Kasplex EVM* address, and reads the true owner from KNS server-side —
      but those are different keypairs, so someone who knows a domain's KNS owner can
      still occupy its listing row. Rows carry `ownership_verified = false` to be honest
      about this, and the UI should show it. Closing it means verifying a Kaspa L1 message
      signature server-side, which needs Kaspa's personal-message hashing and address
      encoding reimplemented — deliberately not hand-rolled untested, because a verifier
      that wrongly accepts is worse than an admitted gap. `@noble/curves` is already a
      dependency and is the right tool when someone can test against a real Kasware
      wallet.
- [ ] **Site copy still describes the on-chain product.** `/docs`, the homepage's
      "one-time payment for lifetime exposure" and "210 KAS", and `/business-plan` all
      promise permanence, on-chain recording and a fee. None of that is what happens now.
      This is user-facing and shouldn't sit unresolved — see the notice at the top of
      [`BUSINESS_PLAN.md`](./BUSINESS_PLAN.md).
- [ ] **Nothing has been run against a real Supabase project.** Everything is verified by
      type-check, lint and build only; no query, insert or RLS policy has executed. The
      schema and endpoints should be treated as unproven until someone provisions a
      project and exercises them (see `MIND.md` principle #10 — this is exactly the
      ABI-correct-but-chain-wrong shape of mistake, one layer over).
- [ ] **Reconciliation plan for when the contracts come back.** `domains.tx_hash` and
      `votes.tx_hash` exist for this, but nothing populates or reads them yet. Decide
      whether the database becomes a cache of chain state, stays authoritative, or the two
      are merged — before there's enough data for the answer to be painful.
- [ ] **No backups or migration tooling.** The schema is a single `schema.sql` applied by
      hand. Fine for now; not fine once real listings exist.

## Incomplete / half-built code

All three items previously tracked here were resolved on 2026-09-05 — the decide-or-delete
calls were made, consistently, in favour of never letting a placeholder flow look real:

- **`src/components/DomainForm.tsx`** — was disconnected from the real listing flow
  (`alert('Form submitted...')` over placeholder wallet/contract data). Now a small
  deprecated compatibility component that collects nothing, submits nothing, and links to
  `/list-domain` instead.
- **`src/app/domains/new-listings/page.tsx`** — was completely non-functional
  (`CONTRACT_ADDRESS` was the literal string `'0xYourContractAddressHere'`, a hardcoded
  999 KAS fee, and a `listDomain` call whose argument shape didn't match the real
  signature). Now a 12-line redirect to `/list-domain`, deliberately *not* forwarding a
  `name` query parameter, since the real flow derives available domains from the connected
  wallet rather than accepting arbitrary input.
- **`src/components/CustomizeDomainForm.tsx`** — deleted. The entire 98-line file was
  commented out, so it exported nothing and was imported nowhere (unlike `DomainForm.tsx`,
  there was no reachable entry point needing a compatibility shim). It also described an
  off-chain `/api/domains/[domain]/customize` endpoint that has never existed and which
  contradicts the on-chain-only data model — the on-chain home for tagline/bio is
  `DomainDataStorage`, still unwired and still blocked by the MCOPY bug (see `BUGS.md`).

## Dead code (confirmed unused, safe to delete)

Everything previously listed here has been deleted (2026-09-05), after re-confirming via
precise import-statement greps (not just a directory-name substring match) that nothing
outside each file's own directory imported it, and that no barrel/`index.ts` re-exported
any of them:

- **`src/hooks/likes/*`** (5 files) — an entire unused hook directory that also called the
  same wrong/nonexistent `DomainVotesManager` function names the real voting code used to
  (see `BUGS.md`).
- **`src/hooks/solidity/*`** (5 files) — turned out to be the *entire* directory, not just
  the 2 files (`useRegisterDomain.ts`, `useKaspaDomainsRegistry.ts`) originally flagged
  here; `useDomainLikes.ts`, `useMyVotes.ts`, and `useNewListings.ts` in that same
  directory were confirmed unused too.
- **`src/data/categories/*.ts`** (16 files, not 14 as originally counted here) — the real
  category system is fully on-chain via `DomainCategoriesStorage`
  (`categoriesManifest.ts`).
- **`src/types/db.ts`** — its `Domain` interface had `price`/`seller_telegram`/
  `kaspa_link`/`listed` fields (the marketplace shape `/domains` used to fake, separately
  fixed) and a commented-out earlier CSP draft referencing `https://supabase.com` — likely
  the origin of the still-open "why does live `proxy.ts` allowlist Supabase" question
  below. That question is still open even though this file is gone; this just explains
  where the string probably came from.

Verified with a real `npm run build` (exit 0) and `tsc --noEmit` after deletion, not just
a grep.

## Future feature specs (things explicitly requested, not achievable today)

- [ ] **Admin-adjustable listing fee.** Requested: "admin can change domain price listing
      at any time." Not possible with the deployed `KaspaDomainsRegistry` — `DOMAIN_FEE`
      is a `view`-only constant with no setter anywhere in the ABI (unlike
      `DomainVotesManager`, which has real `voteFee` + `setVoteFee`). What it would take:
      1. A new contract version with `setDomainFee(uint256)` (owner-only), mirroring
         `setVoteFee` — needs real Solidity source (not in this repo) and a security
         review before deployment.
      2. Deploy it, then update [`src/lib/contracts.ts`](../src/lib/contracts.ts) to the
         new address.
      3. Add an admin control for it in `/EcosystemAdmin`.
      4. No further frontend work needed beyond that — `useListDomain.ts` already reads
         `DOMAIN_FEE()` live at submit time rather than hardcoding it, so it'll pick up
         whatever the contract says automatically.

## Infrastructure / process

- [x] ~~No CI workflow~~ — added 2026-09-05 (`.github/workflows/ci.yml`): runs
      `npm ci`, `npm run lint`, and `npm run build` on every push and pull request.
      Committed and pushed 2026-09-05, after the type/lint errors on `main` were fixed, so
      its first run starts green rather than immediately red.
      Coverage is better than it looks: `next.config.ts` sets no
      `typescript.ignoreBuildErrors` override, so `next build` type-checks too — lint,
      types, and build are all gated. Still not covered: there are no tests to run (see
      the next item), so CI can prove the app compiles and lints, not that it behaves.
- [ ] No real test coverage. `src/test/a.tsx` is an empty placeholder. At minimum, the
      contract-interaction hooks (`useListDomain`, wallet hooks) move real KAS value and
      are the highest-risk code paths to leave untested.
- [ ] No Kasplex **mainnet** chain definition — only `kasplexTestnet` exists in
      [`src/lib/viemChains.ts`](../src/lib/viemChains.ts). Note: Kasplex mainnet is a real,
      live network now (launched ~September 2025) with published endpoints
      (`evmrpc.kasplex.org` / `explorer.kasplex.org`) — this is no longer a "doesn't exist
      yet" gap, just an unadded config. See [`KASPA_DEVELOPMENT.md`](./KASPA_DEVELOPMENT.md).
- [ ] No production contract addresses in `contracts.ts` (testnet-only).
- [ ] No contract security audit — and no Solidity source in this repo to audit. Hard
      blocker before any mainnet deployment, regardless of frontend readiness.
- [x] <a id="lint-debt"></a>**Lint debt — cleared 2026-09-05.** `npx eslint .` now reports
      **0 problems across 110 linted files** (verified via `--format json` and a file
      count, not just a clean-looking summary — a suspiciously empty result is exactly
      what `MIND.md` principle #6 says to check rather than celebrate). Previously 21
      errors + 2 config-file warnings. Resolved in two parts: the
      `react-hooks/set-state-in-effect` instances were refactored out across
      `Sidebar.tsx`, `VotingSection.tsx`, `WalletContext.tsx`, `useKasware.ts`,
      `useKaswareEvmWallet.ts`, `EcosystemAdmin/page.tsx`, `domains/my-votes/page.tsx`,
      `domains/page.tsx`, `search/page.tsx`, `DomainLikeCount.tsx`, and
      `domain/update/[name]/page.tsx` (derived `useMemo` values and cancellation-flag
      effects instead of `setState` in an effect body), and all 5
      `react-hooks/static-components` instances disappeared with the rewrite of
      `domains/new-listings/page.tsx` into a redirect. Now enforced: the CI workflow added
      the same day runs `npm run lint` on every push and PR, so this can't silently drift
      back.

      **What the zero does and doesn't mean** (checked by reading the diffs, not just the
      count — see `MIND.md` principle #13): some of those refactors are real
      (`my-votes/page.tsx` derives `data ?? []` instead of mirroring it into state;
      `search/page.tsx` and `DomainLikeCount.tsx` relocated their guards intact). Others
      are cosmetic: `useKaswareEvmWallet.ts` and `WalletContext.tsx` wrap the same
      synchronous `setState` in an `async function` so the rule stops matching, while the
      cascading-render behaviour the rule warns about is unchanged — `useKaswareEvmWallet`
      in particular now carries noticeably more async-cleanup machinery for no behavioural
      gain. And one was an outright regression, caught and fixed separately (the resource
      editor's dropped `linksLoading` guard, see `BUGS.md`). Two smaller deltas were left
      alone as cosmetic: `Sidebar.tsx` now clears its search box only when the toggle
      button collapses it, rather than on any collapse.
- [ ] Confirm whether `ethers` is still needed alongside `viem`, or fully migrated.
- [x] ~~Confirm whether `https://supabase.com` in the CSP `connect-src` reflects
      real/planned infra or can be removed~~ — answered 2026-09-05: it was a leftover
      *and* it was the wrong host (clients call `https://<ref>.supabase.co`, never the
      marketing site). Supabase is now genuinely used as the primary store, and the
      allowlist entry is derived from `NEXT_PUBLIC_SUPABASE_URL` — correct when
      configured, absent when not. See [`ARCHITECTURE.md`](./ARCHITECTURE.md#data-model).

## Unverified (not gaps or bugs — genuinely unknown, needs testing)

- [ ] Whether `DomainCategoriesStorage.updateCategories` and
      `DomainLinksStorage.updateLinks` are callable by a domain owner or are admin-gated —
      no Solidity source to check, only testable on testnet with a real wallet.
- [ ] The Kasware→Kasplex EVM-signing integration (MetaMask replacement) against a real
      Kasware browser extension — passes all static checks, never run against real
      hardware.

## Watching, not actionable yet

- [ ] **KCC-0020** (Kaspa's draft covenant-native token standard) — a possible future
      successor to KRC-20 on Kaspa **L1**. Doesn't apply to this repo: `KDCToken` is a
      Solidity ERC-20 on **Kasplex (EVM L2)**, a different technology stack from L1
      covenant/UTXO conventions. Kaspa L1 covenants themselves shipped for real via the
      **Toccata hard fork (2026-06-30)** — see
      [`KASPA_DEVELOPMENT.md`](./KASPA_DEVELOPMENT.md) — but that doesn't change this
      assessment on its own. Revisit only if KCC-0020 itself finalizes and there's a
      concrete interop reason (e.g. a bridge). Sources:
      [kaspanet/kccs](https://github.com/kaspanet/kccs),
      [Kasplex KRC-20 wiki](https://wiki.kaspa.org/en/Kasplex_KRC_20).
- [ ] **Igra Network** — a separate EVM L2 on Kaspa L1 (a different "based rollup" from
      Kasplex, which this project uses). Launched a public, Sigma-Prime-audited mainnet
      (2026-03-19). Worth watching as a possible mainnet target, but switching means
      deploying all contracts fresh on a different chain — not a config change. See
      [`KASPA_DEVELOPMENT.md`](./KASPA_DEVELOPMENT.md#2-layer-2s-where-this-apps-contracts-actually-live)
      for what's known about it so far; not evaluated in depth yet.

## Related docs

- [`BUGS.md`](./BUGS.md) — things that are broken, not just missing.
- [`SPEC.md`](./SPEC.md) — the verified technical reference these gaps are measured against.
- [`LIFECYCLE.md`](./LIFECYCLE.md) — how a domain/fee/vote is meant to flow once these gaps
  are closed.
- [`KASPA_DEVELOPMENT.md`](./KASPA_DEVELOPMENT.md) — current Kaspa/Kasplex/Igra ecosystem
  state and a phased plan for closing the mainnet/deployment gaps above.
- [`TODO.md`](./TODO.md) — live backlog, updated by the recurring audit loop.
