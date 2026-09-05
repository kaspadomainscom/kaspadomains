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

- **A fee transaction was a bearer coupon: anyone could spend a stranger's 200 KAS
  payment on their own listing.** Found by Codex (SA-02). `verifyPayment` checked that a
  transaction was accepted and that its outputs to the treasury cleared the required
  amount — but never *who paid it*. Kaspa transactions are public, so anyone watching the
  treasury address could lift a fresh txid and quote it as their own. Because a receipt is
  single-use, that isn't merely freeloading: it **consumes the victim's payment**, leaving
  them with an error and a 200 KAS hole. Fixed by passing the verified signer's
  `kaspa:` address into `verifyPayment` and requiring at least one transaction input to
  belong to it — "any input", not "all", because a wallet may pull from several UTXOs.
  The payer is read from `?resolve_previous_outpoints=light`; if the API can't resolve it
  the request is **refused (503), not waved through**, since an unresolvable payer is
  exactly the case an attacker wants. *Verified* against a real treasury payment on
  mainnet: the API returned
  `inputs: [{ addr: 'kaspa:pzz87gs2…', amt: 200000000 }]`, so the check has something real
  to match on rather than silently passing on an empty list.
- **One payment could fund both a listing and a vote.** Found by Codex (SA-03). Single-use
  was enforced by `unique (payment_tx_id)` on `domains` and, separately, on `votes` — two
  constraints that know nothing about each other. A 200 KAS listing receipt therefore also
  cleared the 1 KAS vote threshold and could be spent a second time. Fixed with
  `payment_receipts`, one global ledger whose primary key is the txid, claimed *before* the
  action is written and released if that write fails
  ([`claimReceipt.ts`](../src/lib/server/claimReceipt.ts)). Claim-then-write, not
  check-then-write: a "has this been used?" read would let two concurrent requests both
  pass before either inserted. Release is best-effort and logs loudly on failure — the
  failure direction is a stuck receipt needing manual clearing, never a double-spendable
  one. The table gets RLS with **no policy at all**, not even read: it links a payer address
  to an action, which is nobody else's business.
- **The CSP report endpoint parsed and logged unbounded attacker input.** Found by Codex
  (SA-06). `/api/csp-violation-report` is unauthenticated by necessity — browsers post to
  it without credentials — and it was reading whatever arrived and `console.log`ing the raw
  object. Anyone could write arbitrary volume into production logs, which costs money and
  buries the real reports the endpoint exists to surface. Fixed by reading the body as text
  with an 8 KB cap (real reports are well under 2 KB), keeping only the ten fields a CSP
  report actually defines, truncating each to 512 chars, and stripping control characters
  so a report can't forge extra log lines. Malformed bodies are now dropped **silently** —
  logging them would move the same log flood into the catch block.
- **Two vulnerable `ws` versions sat in the production dependency tree.** Found by Codex
  (SA-09): `ws@8.17.1` under ethers and `ws@8.18.2` under viem, both below the `8.21.0`
  that patches the high-severity memory-exhaustion advisory
  [GHSA-96hv-2xvq-fx4p](https://github.com/advisories/GHSA-96hv-2xvq-fx4p) (8.18.2 also
  predates the 8.20.1 fix for
  [GHSA-58qx-3vcg-4xpx](https://github.com/advisories/GHSA-58qx-3vcg-4xpx)). Nothing in
  this app currently opens a WebSocket — the Kasplex client is HTTP — so no reachable
  exploit existed, which is exactly why it was worth fixing *before* something starts using
  one. Fixed with an `overrides: { "ws": "^8.21.0" }` in `package.json`, which collapses
  both copies to `8.21.3`; `npm audit fix` cleared the remaining dev-tooling advisories.
  *Verified*: `npm audit --omit=dev` and plain `npm audit` both report **0
  vulnerabilities**, and lint, `tsc --noEmit` and `npm run build` all pass on the updated
  tree. (Codex's report noted `npm audit` couldn't run in their environment because npm
  rejected the certificate chain; it ran here.)

- **The API accepted any existing category, including ones we'd withdrawn.** Found by Codex
  (SA-07). The listing route checked only that a category key was non-empty; the foreign key
  did the rest. But a foreign key proves a row *exists* — it says nothing about
  `is_allowed`. The UI offers only allowed categories, and the UI is not the security
  boundary. Fixed by checking every submitted key against `is_allowed = true` in the route,
  positioned after ownership (so it isn't an open probe of the category table) and before
  the receipt is claimed (so a rejected listing doesn't consume the payment).
- **Signed write requests didn't cover the request body, so a signature authorised any
  body.** Found by Codex during an auth audit. `signedMessage.ts` signed only the action,
  domain, public key and timestamp — the `links` array, `categories` and `paymentTxId`
  travelled unsigned. The obvious reading is replay, but it was worse: **the message format
  is public**, so any website could have prompted a visitor to sign that innocuous-looking
  string ("KaspaDomains request / action: update-links / domain: theirs.kas") and then
  posted it to our API with links of its own choosing. The victim's public profile would
  display them. No interception or privileged position required. Fixed by hashing the body
  into the signed message: `canonicalJson` (keys sorted, array order preserved) →
  SHA-256 → a `payload:` line in the message. The server **recomputes** that digest from
  what actually arrived rather than accepting one sent alongside, since a client-supplied
  digest would prove nothing — an attacker substituting the body would substitute the
  digest too. All three routes pass `extractPayload(body)`, so everything outside the
  signed envelope is covered. *Verified*, rather than assumed: an untampered body agrees
  across client and server, substituted links change the digest, an added field changes
  it, key order does **not** affect it (it would otherwise fail honest requests at
  random), and array order **does** (link order is meaningful). Remaining gap, logged in
  `GAPS.md`: no one-time nonce, so a byte-identical replay inside the 5-minute window is
  still possible — currently a no-op thanks to idempotency and the unique constraints.
- **Every write flow still demanded a Kasplex EVM connection it no longer uses, and the
  resource editor's Save button did nothing at all without one.** Fallout from moving
  signing to the Kaspa L1 key: `/list-domain`, `PickDomainModal` and
  `/domain/update/[name]` all gated on `isEvmConnected`, so a domain owner with only
  Kasware's L1 side connected — which is now the *only* wallet the database path needs —
  was told to connect a wallet that has nothing to do with the request. Worst of the three
  was `handleSubmit` in the resource editor: `if (!kasplex.account) return;` returned
  **silently**, so clicking Save produced no save, no error and no explanation. Each gate
  now requires Kasware (L1) always and Kasplex only on the on-chain fallback path, and the
  silent return became a visible message. `useUpdateDomainLinks` accepts a null account
  and only rejects it where the chain path actually needs one. Found by auditing every
  caller after changing the auth model rather than assuming they still fit
  (`MIND.md` principle #12); the type-checker had nothing to say, because the old code was
  type-correct and merely wrong. Also stopped the editor reading `MAX_LINKS` from the dead
  contract when the database is the store — a request that always failed and always fell
  back to the same constant the API already enforces.
- **`/search` reported an outage as "No matching domains found."** The page stored results
  as `Domain[] | null` and rendered `null` as "No matching domains found." — collapsing
  three different answers ("still searching", "searched, nothing matched", and "couldn't
  load the domain list at all") into one confident negative. With the registry contract
  currently unreachable, that meant every search told the user their term didn't exist,
  when the truth was the app never loaded a single domain — the exact
  failure-dressed-as-real-content problem in `MIND.md` principles #2 and #3. It also had a
  stale-response race: a slower fetch for an earlier query could resolve last and
  overwrite the results for the query the user had moved on to. Fixed by modelling the
  four states explicitly (`idle` / `loading` / `ready` / `error`) with a distinct message
  each — including "Couldn't load the domain list … this is a problem on our side, not
  with your search" — and adding a cancellation flag so superseded queries can't overwrite
  current results. [`getAllDomains`](../src/data/domainLookup.ts) now propagates the
  failure instead of swallowing it into `[]`, which is what made the distinction
  expressible at all; it has exactly one caller (this page), checked per `MIND.md`
  principle #12, and `findDomainByName`'s existing swallow-and-return-undefined behaviour
  was deliberately left as-is since its callers genuinely treat "not found" and "couldn't
  check" the same way.
- **A data-loss race in the resource editor, caught before it shipped.** While removing
  `domain/update/[name]/page.tsx`'s two `set-state-in-effect` lint errors, the effect that
  seeded the editor with existing on-chain links was replaced by a derived value
  (`!linksSeeded && existingLinks.length > 0 ? existingLinks : links`) — but the
  `linksLoading` guard the old effect had was dropped along with it. That opened a real
  window: if the user typed before the `getLinks` read resolved, `linksSeeded` flipped to
  `true`, the links arriving afterwards were never displayed, and because
  `DomainLinksStorage.updateLinks` is a **bulk replace** (see `SPEC.md`), saving would
  have silently wiped every existing link from the contract. Not currently reachable in
  production only because `getLinks` fails 100% of the time right now (the MCOPY bug
  above) and always returns an empty list — it would have become live the moment the
  contract was redeployed and fixed. Fixed by keeping the lint-clean derived-value
  approach but gating the whole editor on the load (`editorLocked = linksLoading`):
  inputs, the remove/add-row buttons, and submit are all disabled, and the counter shows
  "Loading your current links…" until the read resolves, so `linksSeeded` cannot flip
  early. Also hardened [`useGetDomainLinks.ts`](../src/hooks/domain/useGetDomainLinks.ts),
  which the gate now depends on: it previously left `loading` stuck `true` forever when
  handed an empty domain (which would have locked the editor permanently) and never reset
  `loading` when the domain changed (so a previous domain's finished fetch reported "not
  loading" while the new one was still in flight). It now uses a cancellation flag,
  re-enters the loading state per domain, and clears links on error rather than leaving
  a previous domain's data visible.
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
