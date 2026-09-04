# TODO / Backlog

Last updated: 2026-09-04

Flat, actionable version of the gaps identified in [`PROJECT_PLAN.md`](./PROJECT_PLAN.md#3-known-gaps-found-during-this-audit).
Check items off as they land; keep this list in sync with reality rather than letting it
go stale.

## Recently shipped

- [x] **Homepage "Trending .kas Domains" was 100% fabricated data.** A hardcoded array
      (`wallet.kas`, `defi.kas`, `dex.kas` with made-up vote counts) — domains that don't
      exist as real listings; clicking "View Domain" on any of them would 404. Found while
      checking the site on a mobile viewport (375px) for this loop's first pass. Replaced
      with real data via a new shared helper,
      [`lib/topVotedDomains.ts`](../src/lib/topVotedDomains.ts) (extracted from
      `/domains/top-voted`, now used by both), with a real "no domains listed yet" empty
      state instead of silently showing nothing or crashing.
      Verified with a running dev server + mobile viewport screenshot (not just build/lint)
      that the empty state renders cleanly when the sandbox can't reach the real Kasplex
      RPC — same offline-fallback situation every build this session has hit.
- [x] **Another "Buy Now" instance, missed by the earlier grep pass** — the sitewide
      header ticker ([`trendingDomains.tsx`](../src/components/header/trendingDomains.tsx)),
      visible on every single page. The text was split as `Buy&nbsp;Now` (an HTML entity
      inside JSX), which a plain-text grep for "Buy Now" doesn't match — worth remembering
      for future audits. Its underlying data was already real (pulled from a `trending`
      category via `categoriesManifest`), only the label was wrong. Changed to
      "View Domain".

- [x] **`/domains` (the main browse-all page) contradicted the site's own "not a
      marketplace" stance — a real, significant find, not cosmetic.** It branded itself
      "kaspadomains Market" / "premium domain marketplace" with a "Buy Now" button, while
      `/docs` and `BUSINESS_PLAN.md` explicitly and repeatedly say KaspaDomains does not
      sell domains. Worse, the data backing it was fake: `Domain` has no `price`/`listed`/
      `kaspaLink` fields, so those were cast-and-defaulted (`?? 0`, `?? false`, `?? '#'`)
      — meaning **every domain showed as "Sold" with a dead `href="#"` Buy Now link**, and
      the price/status filters operated on data that was never real. Rebuilt: dropped the
      marketplace framing and the fake price/status filters/columns entirely (there's
      nothing real to filter — every listing costs the same fixed 420 KAS), switched from
      an ad-hoc table to a `DomainCard` grid (consistent with every other domain-listing
      page in the app — this was the only page still using a different layout pattern),
      dark theme. Also fixed `/domains/layout.tsx`'s metadata, which had the same
      "Marketplace"/"purchase" framing.
- [x] **Structured data (JSON-LD) had the same problem, on every single domain page.**
      `getDomainJsonLd()` used schema.org's `Product`/`Offer` vocabulary — the literal
      structured-data shape for "this is for sale" (price, availability, seller) — which
      is precisely what a search engine or shopping aggregator would key off of to treat
      a listing as purchasable. Rewrote it as `ProfilePage`/`Thing` (no commerce fields),
      and fixed the matching "Buy X, a premium KNS domain..." meta description and the
      homepage's `WebSite` JSON-LD description ("...purchase premium KNS domains...").
      Found by grepping the whole codebase for "marketplace"/"Buy Now"/"purchase"/"Sold"
      after finding the `/domains` page issue — this was the only other place it appeared.

- [x] **Design/SEO/pages audit pass.** Found and fixed several concrete bugs while going
      through the remaining untouched pages:
      - **`og-image.png` was actually `kaspadomains-logo.jpg` renamed** (byte-identical,
        confirmed via SHA-256) — a 1024×1024 JPEG, not the 1200×630 PNG every page's
        metadata claimed. Fixed the declared dimensions everywhere (`layout.tsx`,
        `page.tsx`, category page, domain page) to the real 1024×1024. A proper branded
        1200×630 banner image is still a real gap — see "Real gaps" below, this isn't
        something I can generate.
      - **`twitter-image.png` didn't exist at all** — referenced in `layout.tsx`, would
        404 on every Twitter Card fetch. Pointed it at the real `og-image.png` instead.
        Also removed a literal placeholder Twitter handle (`creator: "@yourTwitterHandle"`)
        that was never filled in.
      - **`robots.txt` blocked five routes that don't exist** (`/admin/`, `/login`,
        `/signup`, `/domain/new`, `/domain/edit` — generic boilerplate, never real routes
        here) **while leaving the actual admin dashboard and edit route fully
        crawlable/indexable** (`/EcosystemAdmin`, `/domain/update/`). Fixed to disallow the
        real sensitive routes plus `/search` (query-param space is unbounded, plus it's
        already `noindex` via metadata).
      - **`/domains/top-voted` was a literal stub** (`<p>what</p>`) backed by a fully dead,
        commented-out hook (`useTopVotedDomains.ts`, imported a module that doesn't exist).
        Rebuilt for real as a server component using
        `DomainVotesManager.getTopVotedDomains(hashes[])` (a batch query — one call instead
        of N) against all active listed domains from `categoriesManifest`, sorted and
        capped at top 24. Deleted the dead hook. This page is linked from the sidebar nav,
        so it was a real, reachable broken page, not an orphan.
      - **`DomainCard.tsx`** (used on `/domains/top-voted`, `/domains/my-domains`,
        `/domains/my-votes`, and category pages) was a white card with a purple accent —
        the one remaining light-themed shared component after the earlier theme
        unification pass. Restyled to match. Also fixed its "View on Kaspascan" link, which
        pointed a Kaspa L1 block explorer at a Kasplex (EVM L2) domain hash as if it were
        an L1 transaction ID — wrong chain, wrong ID type, guaranteed-broken link. Now
        links to the owner's address on the Kasplex explorer instead.
      - **`/search`** was light-themed with zero metadata (title/description just
        inherited the generic root layout). Restyled dark, added a `layout.tsx` with real
        metadata and `noindex` (search-result pages shouldn't be indexed).

- [x] **Upgraded to Next.js 16** (`16.3.4`, from `15.3.3`). Verified real breaking changes
      against the official docs before touching anything:
      - `src/middleware.ts` → `src/proxy.ts` (`middleware()` → `proxy()`) — the middleware
        convention is deprecated in v16 in favor of `proxy`; confirmed working post-rename
        (`ƒ Proxy (Middleware)` in build output, CSP header with nonce present at runtime).
      - `next lint` was removed entirely. Migrated via the official
        `npx @next/codemod@canary next-lint-to-eslint-cli .` — hand-editing
        `eslint.config.mjs` to native `eslint-config-next/core-web-vitals` +
        `eslint-config-next/typescript` imports first hit a real bug (the old
        `FlatCompat().extends(...)` bridge pattern crashes with `Converting circular
        structure to JSON` against v16's `eslint-config-next`), so the codemod's version
        (native flat-config imports) is the one that shipped.
      - No sync `params`/`headers`/`cookies` usage was found anywhere (already async
        throughout from earlier work this session) — nothing to change there.
      - `next.config.ts` had no custom `webpack` config or `eslint` option, so
        Turbopack-by-default (`next build`) and the `eslint` option removal needed no
        changes.
      - Verified with `tsc`, the new `eslint .` lint script, `next build`, and an HTTP
        smoke test of a running production server.
      - **New finding from the stricter v16 lint ruleset**: `eslint-config-next@16` ships a
        stricter `react-hooks` ruleset that now flags 25 pre-existing
        `react-hooks/set-state-in-effect` violations (calling `setState` synchronously
        inside `useEffect`) across `Sidebar.tsx`, `VotingSection.tsx`, `WalletContext.tsx`,
        `useKasware.ts`, and `useKaswareEvmWallet.ts` — none of these block the build
        (`next build` no longer runs ESLint at all in v16), but they're real lint failures
        now if `npm run lint` is wired into CI. Not fixed in this pass — pre-existing
        patterns across many files, a separate piece of work from the framework upgrade
        itself. See the "Real gaps" section below.

- [x] **MetaMask removed — Kasware now signs Kasplex transactions too.** Verified against
      Kasware's official docs (docs.kasware.xyz) that it ships an EIP-1193-compliant EVM
      provider at `window.kasware.ethereum` for Kasplex (Kaspa's EVM L2), detectable via
      `window.kasware.ethereum.isKasWare` — separate from `window.kasware`'s L1 methods
      used for KNS ownership proof. One wallet extension now covers both jobs, so the
      MetaMask connection is no longer needed.
      - New [`useKaswareEvmWallet.ts`](../src/hooks/wallet/internal/useKaswareEvmWallet.ts)
        + [`lib/kaswareEvm.ts`](../src/lib/kaswareEvm.ts) (shared provider/client helper,
        used by all three write hooks instead of each duplicating MetaMask-detection code).
      - `WalletContext`'s `metamask` field is renamed `kasplex` throughout (13 consuming
        files updated); the Header's two wallet buttons became one "Connect Kasware" button
        that connects both the L1 and L2 capabilities in sequence.
      - Deleted `useMetamaskWallet.ts`, the `@metamask/detect-provider` and
        `@metamask/providers` npm packages, the `metamask.io` CSP entry, and (finally)
        `list-domain-test/page.tsx` (the long-flagged exact duplicate of `list-domain`,
        removed now rather than kept in sync through this refactor for no reason).
      - **Important caveat**: this was verified with `tsc`/lint/build and HTTP smoke tests
        of every route, but **not against a real Kasware browser extension** — there's no
        way to do that in this sandbox. The integration follows Kasware's documented
        conventions, but real-world testing (connect, list a domain, vote, save resources)
        with the actual extension is still needed before trusting this on testnet/mainnet.
      - Not touched (pre-existing, unrelated dead code, already broken/unused before this
        change): `useRegisterDomain.ts`, `useKaspaDomainsRegistry.ts` (unused anywhere),
        and `domains/new-listings/page.tsx` (already flagged elsewhere in this file as
        non-functional — its stray "MetaMask" text doesn't matter until someone decides to
        fix or delete the whole page).

- [x] **Site-wide theme unification.** The site was split between a dark navy theme
      (home, docs, learn, header, sidebar) and a light theme left over on the domain
      profile page, `VotingSection`, `domain/update/[name]`, and the footer. Standardized
      everything on the dark theme: `layout.tsx` body background, `Footer.tsx` (also gained
      a real nav with links to Domains/Categories/Learn/Docs/Business Plan), and every
      component under `domain/[name]` and `domain/update/[name]`. Also fixed a broken CSS
      class (`text-kaspa-green` — no matching rule anywhere in `globals.css`, so that text
      was silently rendering in the default color) in `learn/page.tsx`, replaced with the
      real `text-kaspaMint` utility.
- [x] **`/docs` rebuilt as an actual wiki-style page.** Was a flat single column with a
      top TOC block. Now a sticky sidebar nav with scroll-spy active-section highlighting
      (`IntersectionObserver`), plus a `layout.tsx` giving it real metadata (it had none —
      inherited only the generic root title before). Also fixed a stale copy claim ("We
      *will* use the official KNS smart contracts" — future tense, but this is already
      implemented) and added categories as a listed requirement.
- [x] **`docs/BUSINESS_PLAN.md` is now also a real public page** at
      [`/business-plan`](../src/app/business-plan/page.tsx) (adapted for a public audience —
      the internal doc's risk log and open questions weren't republished verbatim), linked
      from the footer and included in `sitemap.xml`.
- [x] **Fixed remaining vote-price copy inconsistencies.** The real on-chain vote cost is
      6 KAS (`VotingSection.tsx`'s `parseEther("6")`), but copy elsewhere said 5 KAS or
      24 KAS in different places before this session's earlier passes; this pass verified
      all remaining live copy (home, docs, learn) now consistently says 6 KAS.

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

- [ ] **`src/app/domains/new-listings/page.tsx` is completely non-functional** — found while
      chasing down a "999 KAS" price inconsistency. `CONTRACT_ADDRESS` is the literal string
      `'0xYourContractAddressHere'` (never filled in), the fee is hardcoded to 999 KAS
      (should be 420), and it calls `contract.listDomain(domainInput, {...})` with a whole
      object as the first argument — the real `KaspaDomainsRegistry.listDomain` signature is
      `(string domain, address to)`, so even with a real address this call would revert.
      It's not linked from anywhere in the app (no nav link, not in `sitemap.xml`), so low
      urgency, but worth a decision: finish it for real or delete it.
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

## Continuous audit loop — backlog for next iterations

A recurring local loop (`/loop 8m`, job `2e58e210`) is running audit-and-fix passes across
UI/UX, content, SEO, and missing-page gaps. Checked so far: homepage + trending data,
`/domains`, `/domains/top-voted`, `/search`, `DomainCard`, OG/Twitter metadata, robots.txt,
marketplace-language across the whole site. Not yet checked, in rough priority order:

- [ ] Mobile menu (hamburger) — clicked during this pass but couldn't confirm it opened
      (browser pane went hidden mid-interaction); verify for real next iteration.
- [ ] Missing pages: no Terms of Service, Privacy Policy, or About/Team page found
      anywhere in `src/app/`. For a dApp handling real KAS payments this is a real
      trust/legal gap, not just a nice-to-have — worth a decision on scope before writing
      anything (legal content shouldn't be invented without input).
- [ ] Image `alt` text audit across the site — spot-checked a few components, not
      systematic yet.
- [ ] Internal linking audit — e.g. does `/learn` link to `/list-domain`? Do category
      pages cross-link to `/docs`? Not yet checked systematically.
- [ ] Mobile check remaining pages: `/list-domain`, `/domain/[name]`, `/domain/update/[name]`,
      `EcosystemAdmin`, `/domains/my-domains`, `/domains/my-votes`.
- [ ] Competitor/search-intent research for Kaspa/KNS domain discovery sites — not started.
- [ ] Re-grep periodically for marketplace-adjacent language using entity-aware patterns
      (this pass's "Buy&nbsp;Now" catch shows plain-text grep isn't sufficient alone).

## Real gaps (not just cleanup)

- [ ] **No real Open Graph banner image.** `public/og-image.png` is just the square logo
      renamed — every social share (X, Discord, etc.) will show a squished/cropped square
      logo instead of a proper 1200×630 branded banner. This needs an actual design asset;
      I fixed the metadata to stop lying about it (see "Recently shipped"), but a real
      image is still needed.
- [ ] Fix the 25 `react-hooks/set-state-in-effect` lint errors surfaced by the Next.js 16
      upgrade's stricter `eslint-config-next` ruleset (`Sidebar.tsx`, `VotingSection.tsx`,
      `WalletContext.tsx`, `useKasware.ts`, `useKaswareEvmWallet.ts`) — real, pre-existing
      patterns (`setState` called synchronously inside `useEffect`), not build-blocking but
      worth cleaning up, especially if `npm run lint` gets wired into CI (still on the
      backlog below).
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
