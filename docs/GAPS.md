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

## Incomplete / half-built code

- [ ] [`src/components/DomainForm.tsx`](../src/components/DomainForm.tsx) — disconnected
      from the real listing flow (`alert('Form submitted...')` stub). The real flow
      (`list-domain` → `PickDomainModal` → `useListDomain`) already works correctly, so
      this is legacy scaffolding. Delete it, or finish wiring it — pick one.
- [ ] [`src/components/CustomizeDomainForm.tsx`](../src/components/CustomizeDomainForm.tsx)
      — large blocks of commented-out JSX (tagline/bio fields). Half-finished.
- [ ] [`src/app/domains/new-listings/page.tsx`](../src/app/domains/new-listings/page.tsx)
      is completely non-functional: `CONTRACT_ADDRESS` is the literal string
      `'0xYourContractAddressHere'`, the fee is hardcoded to 999 KAS, and it calls
      `contract.listDomain(domainInput, {...})` with a whole object as the first
      argument — the real signature is `(string domain, address to)`, so even a real
      address wouldn't save it. Not linked anywhere in the app (no nav, not in
      `sitemap.xml`), so low urgency, but needs a decide-or-delete call.

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

- [ ] No CI workflow — nothing runs `npm run lint`/`npm run build` on push/PR.
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
- [ ] <a id="lint-debt"></a>**Lint debt**: exactly 21 errors + 2 unrelated config-file
      warnings, per a full `npx eslint .` run (2026-09-05, not a `tail`-truncated one —
      the previous "~20 problems" estimate here had also miscategorized one file, see
      `MIND.md` principle #6). None build-blocking (`next build` doesn't run ESLint in
      v16) but real if `npm run lint` ever joins CI:
      - `react-hooks/set-state-in-effect` (calling `setState` synchronously inside
        `useEffect`) — 16 instances across 12 files: `Sidebar.tsx` (1),
        `VotingSection.tsx` (2), `WalletContext.tsx` (1), `useKasware.ts` (1),
        `useKaswareEvmWallet.ts` (1), `EcosystemAdmin/page.tsx` (2),
        `domain/update/[name]/page.tsx` (2), `domains/my-votes/page.tsx` (1),
        `domains/page.tsx` (1), `search/page.tsx` (1), `DomainForm.tsx` (1) — previously
        miscategorized here as `static-components`, it's actually this rule — and
        `contracts/DomainVotesManager/DomainLikeCount.tsx` (1), which was missing from
        this list entirely before.
      - `react-hooks/static-components` (a component defined inside another component's
        render body) — 5 instances, all in `domains/new-listings/page.tsx` (`InputField`
        used 4 times, `DynamicListInput` once) — already flagged as dead/non-functional
        above, so fixing its dead-code status matters more than fixing its lint.
- [ ] Confirm whether `ethers` is still needed alongside `viem`, or fully migrated.
- [ ] Confirm whether `https://supabase.com` in the CSP `connect-src`
      ([`src/proxy.ts`](../src/proxy.ts)) reflects real/planned infra or can be removed.

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
