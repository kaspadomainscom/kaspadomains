# TODO / Backlog

Last updated: 2026-09-04

Flat, actionable version of the gaps identified in [`PROJECT_PLAN.md`](./PROJECT_PLAN.md#3-known-gaps-found-during-this-audit).
Check items off as they land; keep this list in sync with reality rather than letting it
go stale.

## Recently shipped

- [x] **Category is now mandatory when listing a domain.** `PickDomainModal` fetches the
      on-chain allowed-category list (`useGetAllowedCategories`) and disables the "List for
      420 KAS" action until at least one is picked. On successful listing, the new
      [`useSetDomainCategories`](../src/hooks/domain/useSetDomainCategories.ts) hook writes
      the choice to `DomainCategoriesStorage.updateCategories`. **Unverified risk:** the
      Solidity source isn't in this repo, so whether `updateCategories` is callable by the
      domain owner (vs. admin-only) hasn't been confirmed — if it reverts, the toast will
      say listing succeeded but category assignment failed. Watch for this on testnet and
      confirm with whoever holds the contract source.
- [x] **Full SEO pass.** Found and fixed a real, live bug: `src/app/**/head.tsx` (4 files)
      is a Next.js App Router convention that was removed in favor of the Metadata API —
      confirmed against current Next.js docs — so none of that JSON-LD or those meta tags
      were ever actually rendered. Ported the real content into `generateMetadata` /
      page bodies and deleted the dead files:
      - Home (`/`), domain profile (`/domain/[name]`), category (`/domains/categories/category/[category]`),
        and the domain browser (`/domains`, via a new `layout.tsx` since its `page.tsx` is a
        client component) now all render real JSON-LD (`WebSite`, `Product`, `ItemList`).
      - Added `alternates.canonical` to domain and category pages.
      - Fixed [`sitemap.xml`](../src/app/sitemap.xml/route.ts): it was linking to
        `/domains/{name}` and `/domains/categories/{cat}`, neither of which are real routes
        (should be `/domain/{name}` and `/domains/categories/category/{cat}`) — every
        listed domain was effectively unindexable via the sitemap until this fix.
      - Verified with a production build + server (title tags, canonical links, and JSON-LD
        all confirmed present in rendered HTML).
- [x] **Removed KDC/token-reward pitching from the live site.** Product direction: lead
      with domain listing + categories + resources, not tokenomics. Rewrote copy on the
      homepage, `/docs`, and `/learn` (which was 100% tokenomics — halving schedule, minted
      supply, LP burn stats — and got fully rewritten); deleted the now-unused
      `EcosystemDistribution` (learn) component. Left `src/lib/contracts.ts` and the ABI
      JSON files untouched — the `KDCToken` contract still exists and votes still mint it
      on-chain, this only changes what the site *says*, not the deployed contract behavior.
      `/EcosystemAdmin` (internal fund dashboard) was also left untouched — it's an
      operational tool, not marketing copy.
- [x] **Domain resource links (X account + other links) — built for real.** This closes
      part of the long-standing "domain profile updates are faked" gap:
      - Fixed a real type bug in
        [`useGetDomainLinks.ts`](../src/hooks/domain/useGetDomainLinks.ts) — it declared
        the contract's return type as `string[]` when `DomainLinksStorage.getLinks` actually
        returns `{name, url}[]` tuples. Links were never going to render correctly before
        this fix.
      - New [`useUpdateDomainLinks.ts`](../src/hooks/domain/useUpdateDomainLinks.ts) hook
        writes to `DomainLinksStorage.updateLinks` (bulk replace) via MetaMask.
      - [`domain/update/[name]/page.tsx`](../src/app/domain/update/[name]/page.tsx) rewritten:
        dropped the fake bio/Twitter fields (the `await new Promise(setTimeout...)` stub),
        replaced with a real links editor (label + URL rows, capped at the contract's
        `MAX_LINKS`), gated on both Kasware (KNS ownership proof) and MetaMask (tx signer),
        matching the same dual-wallet pattern as `/list-domain`.
      - New [`DomainResources.tsx`](../src/components/pages/domain/DomainResources.tsx)
        renders the links on the public domain profile page
        (wired into `DomainInfoPanel.tsx`), with a "Manage its resources" link to the
        update page.
      - **Still open**: `DomainDataStorage` (title/description/image/website — the
        general "bio" side of a domain profile) is not wired up; this pass only covers
        the links/resources piece that was explicitly requested. Bio was intentionally
        dropped rather than left half-fake.
- [x] **`docs/BUSINESS_PLAN.md` added** — written around the listing + category + resources
      model, explicitly not pitching token rewards. See the doc itself for the "not a
      marketplace" positioning and the revenue model (420 KAS listing fee, 6 KAS votes).

## Cleanup

- [ ] [`src/app/list-domain-test/page.tsx`](../src/app/list-domain-test/page.tsx) is still
      an exact duplicate of `src/app/list-domain/page.tsx` (both import the same
      `PickDomainModal`, so it did pick up the new category-selection behavior — it's just
      redundant, not stale). Left as-is since deleting it wasn't part of this pass; still a
      cleanup candidate.
- [ ] Resolve [`src/components/DomainForm.tsx`](../src/components/DomainForm.tsx) — either
      delete it (the real flow already works via `useListDomain` +
      `PickDomainModal`) or finish wiring its submit handler to the registry contract and
      replace the `alert(...)` stub.
- [ ] Resolve [`src/components/CustomizeDomainForm.tsx`](../src/components/CustomizeDomainForm.tsx)
      — finish the commented-out tagline/bio fields or remove the dead JSX.
- [ ] Confirm whether `ethers` is still needed alongside `viem`, or whether chain access has
      fully migrated to `viem` and the `ethers` dependency can be dropped.
- [ ] Confirm whether the `https://supabase.com` entry in the CSP `connect-src`
      (`src/middleware.ts`) reflects real/planned infra or can be removed.
- [ ] `src/data/categories/*.ts` (14 files: `100kclub.ts`, `web3.ts`, `meme.ts`, etc.) are
      **not imported anywhere in the app** — confirmed dead. The real category system is
      fully on-chain via `DomainCategoriesStorage` (see `categoriesManifest.ts`). Safe to
      delete unless they're meant as seed/reference data for something not yet built.

## Real gaps (not just cleanup)

- [ ] `DomainDataStorage` (title/description/image/website) is still unwired — the domain
      "bio"/profile-description side of things, as opposed to the links/resources side
      (which is now real, see "Recently shipped"). Decide if this is wanted at all before
      building it.
- [ ] Confirm `updateCategories` access control on `DomainCategoriesStorage` (see "Recently
      shipped" above) — this determines whether the new mandatory-category listing flow
      actually works end-to-end on-chain.
- [ ] Same unverified-access-control risk applies to `DomainLinksStorage.updateLinks` — not
      confirmed whether a domain owner can call it directly or if it's admin-gated.

## Process / infra

- [ ] Add a CI workflow (GitHub Actions) running `npm run lint` and `npm run build` on
      every push/PR — none exists today.
- [ ] Add real test coverage, at minimum for the contract-interaction hooks
      (`useListDomain`, `useLikeDomain`, `useRegisterDomain`, wallet hooks) since these move
      real KAS/KDC value. `src/test/a.tsx` is currently an empty placeholder.
- [ ] Add a Kasplex **mainnet** chain definition in `src/lib/viemChains.ts` alongside
      `kasplexTestnet`, switched via environment variable rather than hardcoded.
- [ ] Add production contract addresses to `src/lib/contracts.ts`, gated by network.
- [ ] Get the Solidity contracts reviewed/audited before any mainnet deployment (out of
      scope for this frontend repo, but a hard blocker for Phase 2 in the plan).

## Future / watch (not actionable yet)

- [ ] **KCC-0020 (covenant-native token standard) — watch, don't build against yet.**
      Researched 2026-09-04 after a request to "upgrade Kaspa tech to KCC-0020": it's a
      *draft* proposal under Kaspa's "Kaspa Calls for Conventions" (KCCs) for a
      covenant-enforced fungible token standard on Kaspa **L1**, positioned as a possible
      successor to KRC-20. As of this writing it has a documented "known supply-split
      defect," has only been run on Kaspa testnet-10, and is not finalized.
      **Doesn't apply to this repo's contracts**: `KDCToken` is a Solidity ERC-20 on
      **Kasplex (an EVM L2)**, not an L1 covenant script — KCC-0020/KRC-20 are base-chain
      UTXO/covenant conventions, a different technology stack from EVM ERC-20. There is no
      code change in this app that would make it "KCC-0020 compliant." Revisit only once
      the standard is finalized and there's a concrete reason an EVM-side contract would
      need to interoperate with it (e.g. a bridge or wrapped-asset design) — not before.
      Sources: [kaspanet/kccs](https://github.com/kaspanet/kccs) (the KCC spec repo),
      [Kasplex KRC-20 wiki](https://wiki.kaspa.org/en/Kasplex_KRC_20) (current, live
      standard for comparison).

## Process note

Recent commit history (`git log`) has no descriptive messages ("Your commit message",
"sdsd", etc.). Consider writing real commit messages going forward so `git log`/`git
blame` stay useful — memory and docs can't substitute for that.
