# Bugs

Last updated: 2026-09-05

Bug tracker: things that are broken relative to what the code/UI claims to do — as opposed
to features that were never built (see [`GAPS.md`](./GAPS.md)). "Open" means still broken
today; "Fixed" is a changelog, most recent first. See [`TODO.md`](./TODO.md) for the live,
actively-updated backlog the continuous audit loop appends to.

## Open

- [ ] **CRITICAL — 4 of 6 contract addresses in `src/lib/contracts.ts` have no deployed
      code on the live Kasplex testnet RPC.** Verified 2026-09-05 by querying
      `https://rpc.kasplextest.xyz` directly (the exact endpoint hardcoded in
      [`viemChains.ts`](../src/lib/viemChains.ts)) with raw `eth_getCode` calls, bypassing
      the frontend entirely:
      - `KaspaDomainsRegistry` (`0x599DB3Ffbba36FfaAB3f86e92e1fCA0465b2CDeA`) → `0x`
      - `DomainVotesManager` (`0xbFB179D21A082cBb30ff245b6bCAb8a5b5566bAa`) → `0x`
      - `DomainCategoriesStorage` (`0x73DeAC4CE5Ae3caCe36F1481B62cb635D9733E0D`) → `0x`
      - `KDCToken` (`0x48526edd858a05f8591c0BA38c10f7493174ee1E`) → `0x`
      - `DomainLinksStorage` and `DomainDataStorage` do have real bytecode — see below.

      Checked at `latest`, `earliest`, and an early block (all empty), and confirmed the
      address's transaction count is `0` — as far as this RPC's history goes, these
      addresses never had a contract deployed on them. Most likely explanation: a testnet
      reset/redeploy where only 2 of 6 addresses in `contracts.ts` were ever updated
      afterward (see [`mind/testnet-mainnet-transitions.md`](./mind/testnet-mainnet-transitions.md)
      for industry context on how plausible/common this kind of reset is). `listDomain` and `voteDomainByHash` are `payable`, and a transaction sent
      to a codeless address doesn't revert — it just transfers the KAS and silently
      succeeds doing nothing — which would normally be a direct fund-loss path. **Traced
      the actual code 2026-09-05: this app happens not to be exposed to it right now**,
      incidentally rather than by design —
      [`useListDomain.ts`](../src/hooks/domain/useListDomain.ts) reads `DOMAIN_FEE()` live
      and [`VotingSection.tsx`](../src/components/pages/domain/VotingSection.tsx) reads
      `voteFee()` live *before* constructing the value-carrying transaction, and
      [`useSetDomainCategories.ts`](../src/hooks/domain/useSetDomainCategories.ts) reads
      `domainHashPublic()` first too; all three reads throw cleanly against a codeless
      address (same "returned no data" failure mode as the `eth_getCode` checks above), so
      none of the three flows can currently reach the point of sending value. **This is
      fragile, accidental protection, not a guarantee** — it depends on this exact
      read-before-write ordering never changing, so still treat real funds as at risk and
      don't rely on this holding. The underlying bug (core product completely
      non-functional) remains just as critical either way. Not something I can fix from
      here — I don't know what the correct current addresses are (if they even exist yet),
      and guessing or redeploying is out of scope (see
      [`MIND.md`](./MIND.md#9-money-moving-and-irreversible-actions-get-flagged-not-executed)).
- [ ] **CRITICAL — Every function on the two contracts that *do* exist fails with
      `invalid opcode: MCOPY`, on every call, regardless of input.** The previously-known
      `DomainLinksStorage.getLinks` MCOPY error is real, but it's not an isolated case —
      verified 2026-09-05 via raw `eth_call` against the live RPC:
      `getLinks`, `getLinkCount`, `getDomainHash` (pure), and `updateLinks` (the write path
      the resources editor uses) on `DomainLinksStorage`, and `getDomainData` on
      `DomainDataStorage`, **all** return `{"code":-32000,"message":"invalid opcode:
      MCOPY"}` for any input tried. Only the zero-argument, no-dynamic-type `MAX_LINKS()`
      succeeds. **Root cause confirmed 2026-09-05 against Kasplex's own network-info docs
      (see [`KASPA_DEVELOPMENT.md`](./KASPA_DEVELOPMENT.md)): Kasplex (testnet *and*
      mainnet) explicitly targets the Shanghai EVM hardfork.** `MCOPY` (opcode `0x5E`) was
      introduced later, in Cancun. Modern `solc` releases default `--evm-version` to
      Cancun or newer, so any contract compiled without explicitly pinning
      `--evm-version shanghai` (or `paris`) will silently emit MCOPY and revert on Kasplex
      — this isn't a mystery infra bug, it's a compiler-target mismatch. Practical effect:
      **the entire resources/links feature is non-functional end to end** (read and write
      both fail), not just the read side as previously thought, and `DomainDataStorage`
      would have the identical problem the moment anyone wires it up (see `GAPS.md`). Fix:
      recompile with `--evm-version shanghai` pinned and redeploy — needs the Solidity
      source (not in this repo, needs to be located/reconstructed) — see
      `KASPA_DEVELOPMENT.md`'s Phase 0 plan.
- [ ] **Displayed listing price (210 KAS) doesn't match the real on-chain charge
      (420 KAS).** By deliberate request — marketing/SEO copy was changed to 210 while the
      actual `KaspaDomainsRegistry.DOMAIN_FEE` (a contract constant, no setter) still
      charges 420. Real, ongoing risk: anyone who lists a domain today gets charged 420
      after being told 210 everywhere on the site — **though see the item above: right
      now `listDomain` can't be charged at all, since `KaspaDomainsRegistry` has no code
      at its configured address.** See [`GAPS.md`](./GAPS.md) for what actually resolving
      the price mismatch requires (a new contract deployment).
- [ ] **Unverified access control on two contract-write paths**: whether a domain owner can
      call `DomainCategoriesStorage.updateCategories` and `DomainLinksStorage.updateLinks`
      directly, or whether they're admin-gated. Moot for now given the two critical items
      above (neither contract can be called successfully at all right now), but worth
      revisiting once those are fixed. No Solidity source in this repo to check directly.
- [ ] **MetaMask→Kasware EVM-signing migration is unverified against a real wallet.** The
      whole rewrite (see Fixed) follows Kasware's documented EIP-1193 conventions and
      passes `tsc`/lint/build/HTTP smoke tests, but there's no way to test against an
      actual Kasware browser extension from this sandbox. Needs real-world testing
      (connect, list a domain, vote, save resources) before trusting it on testnet.
- [ ] **~20 `react-hooks/set-state-in-effect` / `react-hooks/static-components` lint
      errors** (calling `setState` synchronously inside `useEffect`; components defined
      inside another component's render body) across ~10 files. Not build-blocking
      (`next build` doesn't run ESLint in Next 16), but real failures if `npm run lint`
      ever gets wired into CI. Full current list in [`GAPS.md`](./GAPS.md#lint-debt).

## Fixed

Most recent first. Each entry names the file(s), what was actually wrong, and how it was
verified — not just "fixed X."

- **The same catch-block conflation as the `loadCategoriesManifest()` fix, found in a
  second file.** `app/domains/categories/category/[category]/page.tsx`'s page body
  caught a genuine manifest-load failure and called the generic `notFound()` — the same
  bug class as the `domain/[name]/page.tsx` metadata fix above (see `MIND.md` principle
  #11), just in the page body instead of `generateMetadata`. Fixed by separating "the
  contract failed to load" (now shows an honest "Contract Unavailable" message, matching
  `domain/[name]/page.tsx`'s existing pattern) from "this category genuinely doesn't
  exist" (still a real `notFound()`) — while preserving the file's existing "no JSX
  inside try/catch" structure from an earlier lint fix (see the Fixed entry below on
  `react-hooks/error-boundaries`), so the new honest-error JSX is constructed in a plain
  `if` block after the try/catch exits, not inside it. Verified with `tsc --noEmit`,
  `eslint` on the file directly (clean, confirming the lint fix wasn't undone), and a full
  `npm run build`.
- **Deleted 773 lines of confirmed-dead code** (28 files, per `git diff --stat`): the
  entire `src/hooks/likes/` (5
  files) and `src/hooks/solidity/` (5 files — turned out to be all of it, not just the 2
  originally flagged in `GAPS.md`) directories, all 16 files in `src/data/categories/`,
  and `src/types/db.ts`. Re-verified each with precise import-statement greps (not just a
  directory-name substring match, which can false-positive on a file's own header
  comment) and checked for barrel/`index.ts` re-exports before deleting anything.
  Verified safe with a real `npm run build` (exit 0) and `tsc --noEmit`, not just the
  grep. Full detail in `GAPS.md`'s (now historical) dead-code section.
- **`loadCategoriesManifest()` fabricated a fake domain and swallowed real errors,
  feeding placeholder data into ~11 files across the entire app.**
  [`categoriesManifest.ts`](../src/data/categoriesManifest.ts)'s `catch` block returned a
  hardcoded `fallbackManifest` containing one fake entry, `"example.kaspa"` (not even a
  valid `.kas` name), instead of surfacing the failure — and given the still-open CRITICAL
  "no deployed code" item in the Open section above, that fallback was firing on every
  call. Fixed
  by removing the fallback and letting the error propagate; every one of the 11 real
  call sites was checked individually and given its own honest degraded state rather than
  assuming they'd all cope with a new rejection: `app/page.tsx` and
  `app/domains/page.tsx` already degraded to an empty manifest correctly; `lib/jsonld.ts`'s
  `getItemListJsonLd` (called unwrapped from the homepage) now catches internally and
  returns an empty item list; `app/sitemap.xml/route.ts` (a build-time static route, the
  highest-risk unwrapped caller) now catches and falls back to just the static routes
  instead of risking a build failure; `app/domains/categories/page.tsx` now wraps the call
  and reuses its existing "No categories available right now" empty state;
  `data/domainLookup.ts`'s `findDomainByName`/`getAllDomains` (called from the header
  search and `/search` without their own wrapping) now catch and return
  `undefined`/`[]`. A fully dead, unused duplicate implementation
  (`src/hooks/categories/useCategoriesData.ts`, never imported anywhere) was deleted
  rather than fixed. **Direct consequence, also fixed**:
  [`app/domain/[name]/page.tsx`](../src/app/domain/[name]/page.tsx) had a well-written,
  honest "Contract Unavailable" error UI that was dead code — the manifest never actually
  threw, so it always fell through to a generic, misleading "Domain Not Found" 404
  instead. Its `generateMetadata` also conflated Next's internal `notFound()` throw (a
  legitimately-nonexistent domain) with a real contract failure in the same `catch`;
  split into two separate paths so a real 404 and a real outage no longer share a message.
  *Verified*: a full `npm run build` succeeds (exit 0) against the still-broken live
  contracts, the build log shows the new specific error messages being logged instead of
  silent fake success, and the generated `sitemap.xml` contains only the 7 real static
  routes with zero fabricated entries — confirmed against a stale pre-fix dev-cache
  artifact that had actually prerendered a `/domain/example.kaspa.kas` page, direct proof
  this wasn't a theoretical risk. Not fixed: the lower-priority conflation in
  `app/domains/categories/category/[category]/page.tsx` (a real load failure there still
  calls `notFound()` rather than showing its own "unavailable" message) — same class of
  issue, lower traffic path, left for a future pass. Full checklist this was worked from:
  [`mind/fallback-audit-checklist.md`](./mind/fallback-audit-checklist.md).
- **The entire community voting feature called contract functions/an event that don't
  exist.** `VotingSection.tsx` (the "Vote to this domain" button on every domain page)
  called `getDomainLikeCount`, `hasUserLikedDomain`, `likeDomain(domainName, {value})`, and
  listened for a `DomainLiked` event — none of which are in `DomainVotesManager`'s real
  ABI. Real names: `getDomainVoteCount`, `hasUserVotedDomain`,
  `voteDomainByHash(domainHash, {value})` (a `uint256` hash, not the domain string), and
  the `DomainVoted` event. Also used ethers v5's `.toNumber()`, which doesn't exist in
  ethers v6 (this project's version) — reads return native `bigint`.
  [`useGetDomainLikeCount.ts`](../src/hooks/domain/useGetDomainLikeCount.ts) (the "Likes:"
  field on every domain page) and
  [`useMyVotes.tsx`](../src/hooks/domains/useMyVotes.tsx) (`/domains/my-votes`, called
  `getVotesByAddress` — real name `getVotedDomainIds`) had the same class of bug. All
  fixed; the hardcoded "6 KAS" vote price was also replaced with a live read of the
  contract's `voteFee()`. An entire parallel, unused hook directory
  (`src/hooks/likes/*`, 5 files) had the identical wrong-function-name pattern but was
  confirmed dead code (not imported anywhere) at the time — left alone and flagged in
  `GAPS.md`, later deleted the same day (see the dead-code entry above).
  *Root cause discovered by*: a display bug (`DomainLikeCount` used the same string for
  "loading" and "failed to load," so an infinite spinner and a real failure looked
  identical) that, once fixed, surfaced the real ABI-mismatch error in the console.
- **Structured data (JSON-LD) on every domain page used commerce vocabulary
  (`Product`/`Offer`: price, availability, seller) for something that is explicitly not
  for sale.** This is precisely what a search engine or shopping aggregator would key off
  to treat a listing as purchasable — directly contradicting the site's own "not a
  marketplace" stance. Rewrote as `ProfilePage`/`Thing` with no commerce fields
  (`src/lib/jsonld.ts`).
- **`/domains` (the main browse-all page) branded itself "kaspadomains Market" with a "Buy
  Now" button, and the data behind it was fake.** `Domain` has no `price`/`listed`/
  `kaspaLink` fields, so they were cast-and-defaulted (`?? 0`, `?? false`, `?? '#'`) —
  every domain showed as "Sold" with a dead `href="#"` link, and the price/status filters
  operated on data that was never real. Rebuilt without the marketplace framing or fake
  filters, using the same `DomainCard` grid every other listing page in the app uses.
- **A second "Buy Now" instance, missed by an earlier plain-text grep** — the sitewide
  header ticker (`trendingDomains.tsx`) had it as `Buy&nbsp;Now`, an HTML entity inside
  JSX that `grep "Buy Now"` doesn't match. Changed to "View Domain." (Lesson: entity-aware
  greps matter for this kind of audit.)
- **Homepage "Trending .kas Domains" was 100% fabricated data** — a hardcoded array
  (`wallet.kas`, `defi.kas`, `dex.kas` with made-up vote counts). Clicking "View Domain" on
  any of them would 404. Replaced with real data via
  [`lib/topVotedDomains.ts`](../src/lib/topVotedDomains.ts), a shared helper also used by
  `/domains/top-voted`.
- **`/domains/top-voted` was a literal `<p>what</p>` stub**, reachable from the sidebar
  nav, backed by a fully dead commented-out hook that imported a nonexistent module.
  Rebuilt for real using a batch `DomainVotesManager.getTopVotedDomains(hashes[])` call.
- **`sitemap.xml` linked to routes that don't exist** — `/domains/{name}` and
  `/domains/categories/{cat}` instead of the real `/domain/{name}` and
  `/domains/categories/category/{cat}`. Every listed domain was effectively unindexable
  via the sitemap until fixed.
- **`src/app/**/head.tsx` (4 files) was dead code** — a Next.js App Router file convention
  removed years ago in favor of the Metadata API (confirmed against current Next.js docs).
  None of that JSON-LD or those meta tags were ever actually rendered. Ported the real
  content into `generateMetadata`/page bodies and deleted the files.
- **`og-image.png` was `kaspadomains-logo.jpg` renamed** (byte-identical, confirmed via
  SHA-256) — a 1024×1024 JPEG, not the 1200×630 PNG every page's metadata claimed.
  `twitter-image.png` was referenced but didn't exist at all (404 on every Twitter Card
  fetch). Fixed the declared dimensions and pointed both at the real image. A proper
  branded 1200×630 banner is still a real gap (needs a design asset, not a code fix — see
  `GAPS.md`).
- **`robots.txt` blocked five nonexistent routes** (`/admin/`, `/login`, `/signup`,
  `/domain/new`, `/domain/edit` — generic boilerplate, never real routes here) while
  leaving the actual admin dashboard (`/EcosystemAdmin`) and edit route
  (`/domain/update/`) fully crawlable/indexable. Fixed to block the real sensitive routes.
- **`DomainCard.tsx`'s "View on Kaspascan" link pointed a Kaspa L1 block explorer at a
  Kasplex (EVM L2) domain hash as if it were an L1 transaction ID** — wrong chain, wrong ID
  type, guaranteed-broken link. Now links to the owner's address on the Kasplex explorer.
- **`useGetDomainLinks.ts` typed the contract's return as `string[]`** when
  `DomainLinksStorage.getLinks` actually returns `{name, url}[]` tuples — links were never
  going to render correctly before this fix.
- **`domain/update/[name]/page.tsx` faked its save with a `setTimeout`** — no real
  persistence existed for the links/resources feature until it was wired to a real
  `DomainLinksStorage.updateLinks` write.
- **`eslint.config.mjs`'s `FlatCompat().extends(...)` bridge pattern crashed** with
  `Converting circular structure to JSON` against `eslint-config-next@16` (part of the
  Next.js 16 upgrade). Fixed via the official
  `next-lint-to-eslint-cli` codemod, which uses native flat-config imports instead.
- **`react-hooks/error-boundaries` ("Avoid constructing JSX within try/catch") in
  `domains/categories/category/[category]/page.tsx`** — refactored so data-fetching stays
  in try/catch but JSX is constructed outside it. Fixed all 12 instances in that file.

## Related docs

- [`GAPS.md`](./GAPS.md) — missing features, incomplete work, dead code, infra gaps.
- [`SPEC.md`](./SPEC.md) — verified contract addresses and function signatures (the
  ground truth that most of the bugs above turned out to violate).
- [`MIND.md`](./MIND.md) — the operating principles this bug list came from (verify
  before trusting, no fabricated data, etc.).
- [`KASPA_DEVELOPMENT.md`](./KASPA_DEVELOPMENT.md) — the confirmed root cause and fix plan
  for the MCOPY/EVM-version bug above.
- [`TODO.md`](./TODO.md) — live backlog, updated by the recurring audit loop.
