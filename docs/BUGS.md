# Bugs

Last updated: 2026-09-05

Bug tracker: things that are broken relative to what the code/UI claims to do — as opposed
to features that were never built (see [`GAPS.md`](./GAPS.md)). "Open" means still broken
today; "Fixed" is a changelog, most recent first. See [`TODO.md`](./TODO.md) for the live,
actively-updated backlog the continuous audit loop appends to.

## Open

- [ ] **Displayed listing price (210 KAS) doesn't match the real on-chain charge
      (420 KAS).** By deliberate request — marketing/SEO copy was changed to 210 while the
      actual `KaspaDomainsRegistry.DOMAIN_FEE` (a contract constant, no setter) still
      charges 420. Real, ongoing risk: anyone who lists a domain today gets charged 420
      after being told 210 everywhere on the site. See [`GAPS.md`](./GAPS.md) for what
      actually resolving this requires (a new contract deployment).
- [ ] **`DomainLinksStorage.getLinks` throws `invalid opcode: MCOPY`** in the browser
      console on domain profile pages. MCOPY is a Cancun/Dencun-era EVM opcode — could be
      an RPC/EVM-version mismatch, or a genuinely bad call. Not yet investigated. If it's a
      real bug, the domain-resources (X account/links) feature has the same
      "looks built but never actually works" problem voting had (see Fixed, below) — this
      is the top-priority thing to check next.
- [ ] **Unverified access control on two contract-write paths**: whether a domain owner can
      call `DomainCategoriesStorage.updateCategories` and `DomainLinksStorage.updateLinks`
      directly, or whether they're admin-gated. No Solidity source in this repo to check
      directly; only testable by actually trying it on testnet with a real wallet. If
      either turns out to be gated, the corresponding UI (category picker at listing time,
      resource editor) will report success on the listing but silently fail the follow-up
      write.
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
  (`src/hooks/likes/*`, 5 files) has the identical wrong-function-name pattern but is
  confirmed dead code (not imported anywhere) — left alone, flagged in `GAPS.md`.
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
- [`TODO.md`](./TODO.md) — live backlog, updated by the recurring audit loop.
