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

- [ ] Wire up real persistence for domain profile updates in
      [`src/app/domain/update/[name]/page.tsx`](../src/app/domain/update/[name]/page.tsx)
      — currently fakes success with a `setTimeout`. Needs a decision: on-chain write via
      `DomainDataStorage`/`DomainLinksStorage`, or an off-chain API. See open question in
      the plan.
- [ ] Confirm `updateCategories` access control on `DomainCategoriesStorage` (see "Recently
      shipped" above) — this determines whether the new mandatory-category listing flow
      actually works end-to-end on-chain.

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

## Process note

Recent commit history (`git log`) has no descriptive messages ("Your commit message",
"sdsd", etc.). Consider writing real commit messages going forward so `git log`/`git
blame` stay useful — memory and docs can't substitute for that.
