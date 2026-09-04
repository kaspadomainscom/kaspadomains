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
      general "bio" side of a domain profile, distinct from the links/resources side
      (which is real — see `BUGS.md`'s Fixed list). Decide if it's wanted before building
      it; it was intentionally left out rather than half-faked when the resources feature
      was built.

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
- [ ] [`src/app/list-domain-test/page.tsx`](../src/app/list-domain-test/page.tsx) — exact
      duplicate of `list-domain/page.tsx`. Redundant, not broken (both import the same
      `PickDomainModal`, so it stays in sync automatically). Still a cleanup candidate.

## Dead code (confirmed unused, safe to delete)

- [ ] **`src/hooks/likes/*`** (5 files: `useDomainLikes.ts`, `useGetUserLikesPaginated.ts`,
      `useHasUserLiked.ts`, `useLikeDomain.ts`, `useTotalLikesUsed.ts`) — an entire unused
      hook directory, confirmed via grep. Also all call the same wrong/nonexistent
      `DomainVotesManager` function names the real voting code used to (see `BUGS.md`).
- [ ] **`src/data/categories/*.ts`** (14 files) — not imported anywhere. The real category
      system is fully on-chain via `DomainCategoriesStorage` (see `categoriesManifest.ts`).
      Safe to delete unless meant as seed data for something not yet built.
- [ ] **`useRegisterDomain.ts`, `useKaspaDomainsRegistry.ts`** (`src/hooks/solidity/`) —
      unused anywhere in the app.
- [ ] **`src/types/db.ts`** — never imported anywhere (confirmed via grep). Two things
      worth knowing if anyone finds it: (1) its `Domain` interface has `price`,
      `seller_telegram`, `kaspa_link`, `listed` fields — the exact marketplace shape that
      `/domains` used to fake before that was fixed (see `BUGS.md`); (2) it contains a
      fully commented-out earlier draft of the CSP middleware (pre-`proxy.ts` rename) that
      references `https://supabase.com` in `connect-src`. This is the likely origin of the
      "why does live `proxy.ts` still allowlist Supabase with no Supabase usage in `src/`"
      question below — a leftover from an earlier design, not evidence of planned infra.
      Doesn't change the live-CSP question (still open), just explains where the string
      probably came from.

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
      [`src/lib/viemChains.ts`](../src/lib/viemChains.ts).
- [ ] No production contract addresses in `contracts.ts` (testnet-only).
- [ ] No contract security audit — and no Solidity source in this repo to audit. Hard
      blocker before any mainnet deployment, regardless of frontend readiness.
- [ ] <a id="lint-debt"></a>**Lint debt**: ~20 problems, none build-blocking (`next build`
      doesn't run ESLint in v16) but real if `npm run lint` ever joins CI:
      - `react-hooks/set-state-in-effect` (calling `setState` synchronously inside
        `useEffect`) across `Sidebar.tsx`, `VotingSection.tsx`, `WalletContext.tsx`,
        `useKasware.ts`, `useKaswareEvmWallet.ts`, `EcosystemAdmin/page.tsx`,
        `domain/update/[name]/page.tsx`, `domains/my-votes/page.tsx`, `domains/page.tsx`,
        `search/page.tsx`.
      - `react-hooks/static-components` (a component defined inside another component's
        render body) in `domains/new-listings/page.tsx` and `DomainForm.tsx` — both
        already-flagged dead/broken components above, so fixing their dead-code status
        matters more than fixing their lint.
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
      covenant/UTXO conventions. Revisit only if the standard finalizes and there's a
      concrete interop reason (e.g. a bridge). Sources:
      [kaspanet/kccs](https://github.com/kaspanet/kccs),
      [Kasplex KRC-20 wiki](https://wiki.kaspa.org/en/Kasplex_KRC_20).
- [ ] **Igra Network** — a separate EVM L2 on Kaspa L1 (a different "based rollup" from
      Kasplex, which this project uses). Just launched a public, Sigma-Prime-audited
      mainnet (2026-03-19), while Kasplex has no mainnet in this repo yet. Worth watching
      as a possible mainnet target, but switching means deploying all contracts fresh on a
      different chain — not a config change. Not evaluated in depth yet.

## Related docs

- [`BUGS.md`](./BUGS.md) — things that are broken, not just missing.
- [`SPEC.md`](./SPEC.md) — the verified technical reference these gaps are measured against.
- [`LIFECYCLE.md`](./LIFECYCLE.md) — how a domain/fee/vote is meant to flow once these gaps
  are closed.
- [`TODO.md`](./TODO.md) — live backlog, updated by the recurring audit loop.
