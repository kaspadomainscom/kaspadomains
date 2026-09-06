# Bugs

Last updated: 2026-09-07

Bug tracker: things that are broken relative to what the code/UI claims to do — as opposed
to features that were never built (see [`GAPS.md`](./GAPS.md)). "Open" means still broken
today; "Fixed" is a changelog, most recent first. See [`TODO.md`](./TODO.md) for the live,
actively-updated backlog the continuous audit loop appends to.

## Open

Five of the six entries that used to sit here were about the Kasplex contracts. Those
contracts were removed from the codebase on 2026-09-06 (owner decision), so the bugs are
gone with them rather than fixed — see the Fixed section and `MIND.md` #20. What is left:

- [ ] **BLOCKER — `supabase/schema.sql` has never been applied to the live project.**
      Everything else is downstream of this. `npm run db:check` and `/api/status` agree,
      independently, that every table is missing. The connection, both keys and the treasury
      address are all configured and verified; only the SQL has not been run. Until it is,
      **no listing, vote or profile edit has ever been created end to end**, and no RLS
      policy has been proven in practice — the whole write path is verified by type-check,
      lint, build and reasoning alone.
- [ ] **Nothing has been exercised with a real Kasware wallet.** Signing, payment and the
      preflight are implemented against Kasware's documented conventions and cannot be
      tested from here. The residual risk is narrow and fails safe — a signing-convention
      mismatch rejects legitimate owners rather than admitting impostors — but it is
      untested, and it is the second thing to do after the schema.
- [ ] **No proper Open Graph image.** `public/og-image.png` is the square logo renamed, so
      every social share is cropped. Needs a design asset, not code.

## Fixed

Most recent first. Each entry names the file(s), what was actually wrong, and how it was
verified — not just "fixed X."

- **A valid old profile save could replay and overwrite a newer profile.** This was Codex's
  final audit finding (SA-05). Signing the exact body stopped substitution, but it still let
  a byte-identical `update-links` or `update-categories` request run during its five-minute
  window. Both are bulk replacements, so an old tab could restore data it never rendered.
  Fixed in the code path with a profile revision carried from the data read, a short-lived
  owner-issued token bound to domain/action/signer/revision, and a database function that
  locks, compares, consumes, replaces and increments atomically. The migration drops old
  nonce-free RPC overloads, and `db:check` proves each replacement signature exists to the
  service key but is hidden from anonymous callers. Focused read-only review cleared the
  migration-overload and setup-error handling. *Verified locally:* type-check, lint, nine
  native tests, reachability check and whitespace check. The live schema has never been
  applied, so no wallet/database run can yet verify this in deployment; the new routes fail
  closed with 503 when the required setup is absent.

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
- **The two CRITICAL contract bugs are resolved by deletion, not by repair.** For the
  record, since they dominated this file for two days: six of the eight configured addresses
  had no deployed code, and every function on the two that did exist failed with
  `invalid opcode: MCOPY` — Kasplex targets the Shanghai EVM and modern `solc` defaults to
  Cancun+, which emits `MCOPY`. Neither was ever fixed. The contract path was removed
  entirely on 2026-09-06, so there is no longer a compiler target to pin or an address to
  redeploy. The related open items went with it: the 210-vs-420 KAS price mismatch (the fee
  is one constant now, 200 KAS), the unverified contract-write access control, and the
  lint-debt entry (CI runs `npm run lint` and it is clean).
- **The trending strip linked to URLs that immediately redirected, and claimed an empty list
  when it had failed.** `useTrendingDomains` stripped `.kas` before returning, so the
  component had only the display form and rebuilt the href from it — producing `/domain/foo`,
  which the profile page then redirected to `/domain/foo.kas`. The same shape as the header
  search bug: a format stripped in one place and needed in another, with the reconstruction
  guessed rather than owned (`MIND.md` #17). The hook now returns canonical names and the
  component uses `baseDomainName` for the label, so the link and the label come from the same
  owner. Separately, the hook left `names` at `[]` on failure, so an outage rendered "No
  trending domains right now." — decoration, but still a claim. It returns `null` for unknown
  now and the strip renders nothing rather than asserting there are none.
- **A raw `<a>` for an internal link forced a full page reload.** `/domains/top-voted`
  linked to `/docs#voting` with an anchor rather than `next/link`, throwing away client-side
  navigation. The only instance in the app; the rest already use `Link`.
- **`/docs` documented KNS smart-contract calls we have never made.** It told users "we use
  the official KNS smart contracts to ensure domain legitimacy" and listed
  `ownerOf(tokenId)` and `isVerifiedDomain(name)`. We call the KNS **HTTP API**
  (`api.knsdomains.org`), not a contract; `ownerOf` appears nowhere in the codebase, and
  `isVerifiedDomain` exists only as a JSON field on an API response. Plausible-sounding
  function names that do not exist — `MIND.md` #1, except in documentation rather than code,
  where nothing type-checks it. Replaced with what actually happens.
- **`/docs` told users the wrong people can edit a listing.** "Categories and resources can
  be updated by the wallet that listed it." The rule is the opposite and deliberately so:
  the **current KNS owner**, re-read on every request, specifically so a transferred domain
  follows its new owner and stops obeying the old one. That distinction is the entire point
  of the ownership model, and the docs stated its inverse — a buyer would think they cannot
  edit what they own, and a seller would think they still can. Also removed "Unique ID
  (0–9999)", a leftover of the deleted listing cap.
- **Every toast reset every other toast's timer.** The auto-remove effect was keyed on the
  whole `toasts` array, so each add or remove cleared and recreated *all* timers. A toast
  2.9s into its 3s life got a fresh 3s the moment the next one appeared — and the listing
  flow emits four in a row, so the first lived roughly twice its duration and the stack
  drifted further out of sync the more there were. Each toast now gets one timer at creation,
  cancelled on removal and on unmount. *Verified* with a simulated clock: three toasts added
  a second apart each expire exactly at creation + duration; under the old logic the first
  was still on screen 2s late. Also stopped announcing every toast as `assertive` — only
  errors interrupt now, rather than talking over whatever the user is reading.
- **Nine of the sidebar's nineteen category links pointed at categories that do not
  exist.** The list was hard-coded: `ai-tech` for what the schema calls `tech`, `real-words`
  for `realWords`, `memes` for `meme`, plus `profiles`, `vaults`, `tools`, `utilities`,
  `loved` and `active-projects`, which were never categories at all. Roughly **half the
  primary navigation 404'd**, on every page, and nothing could have told us — a link is just
  a string until somebody clicks it. Found by enumerating from the declaration
  (`schema.sql`'s seed) and diffing against the hrefs, per `MIND.md` #18. Fixed structurally
  rather than by correcting nine strings: the list is now derived from
  `useGetAllowedCategories`, with icons mapped by key and a folder fallback, so a category
  added to the database appears here, one removed disappears, and no link can point at
  something that is not there.
- **The mobile sidebar could be closed but never reopened.** `showSidebar = !isMobile ||
  mobileOpen` renders `null` on mobile until `mobileOpen` is true — and the only toggle lived
  *inside* the sidebar. Since `mobileOpen` starts false, the entire navigation surface was
  unreachable on a phone from first load. Added a fixed open button that renders in exactly
  that state. Also corrected `aria-expanded` on the inner toggle, which was bound to
  `showSidebar` and therefore always `true` wherever it rendered.
- **A dead branch survived the contract removal in `useTrendingDomains`.** Its "chain
  fallback" called `loadCategoriesManifest`, which is now Supabase-only — so the branch meant
  to avoid Supabase loaded the *entire manifest* from Supabase instead of one targeted query.
  Strictly worse than the thing it stood in for. This is `MIND.md` #15 on the other side of a
  removal: taking a path out leaves conditionals whose remaining branches no longer mean what
  they say. Also routed its `.kas` stripping through `baseDomainName` rather than a local
  regex.
- **The EVM contract path is gone, and it was never a fallback — it was where the bugs
  lived.** Owner decision, 2026-09-06. Six of the eight configured addresses had no deployed
  code and the other two failed every call with `invalid opcode: MCOPY`, so the "fallback"
  had never answered a single query. Keeping it was not free: because every read and write
  carried two branches and one was never exercised, it directly caused **five** shipped bugs
  already in this file — `feePaid` meaning sompi on one branch and wei on the other, votes
  keyed by the EVM address while stored against the L1 one, a vote counter permanently
  reading "Unavailable", an admin page telling its own administrator "Access Denied", and a
  connect button that required two wallets when only one mattered. Removing it deleted
  **34 files** and took `src/` from 129 source files to 95, and no remaining code had to grow
  a branch to compensate. Distilled as `MIND.md` #20.
  Also removed in the same pass: the **10,000-listing cap**, which was product copy on four
  pages and an assumption in three code comments.
  *Verified*: `tsc`, `eslint` and a clean build all pass; every page returns 200 against the
  live project; `npm run dead:check` drops from 27 unreachable files to 8, all of which are
  Codex's in-flight work and deliberately untouched.
- **The listing page blamed an empty catalogue when the category load failed.**
  `useGetAllowedCategories` sets an `error` *and* empties the list; `PickDomainModal` read
  only the list, so a failure rendered "No categories available right now." Listing requires
  a category, so the user was blocked **and** told the wrong reason for it, on the page where
  they were trying to spend 200 KAS. Now surfaces the actual error and says the action is
  unavailable until it loads. (`CategoryEditor`, which consumes the same hook, was already
  reading `error` — one consumer had it right and one didn't, which is why the hook exposing
  both is not enough on its own.)
- **The main browse page announced "0 domains listed" during an outage.** `/domains` caught
  a failed manifest load and fell back to `{}`, so it rendered a confident count of zero and
  "No domains found matching your search" — on the page whose entire job is showing what
  exists. Now three outcomes, with the failure saying it is a problem on our side and not an
  empty directory. *Verified in a real browser* against the live project with the schema
  unapplied: the page shows the failure text and neither of the two false statements.
- **Pagination rendered one button per page — 500 of them at the design cap.** 10,000
  listings at 20 per page is 500 numbered buttons, which is a wall nobody can use and a lot
  of DOM for no benefit. Replaced with Prev/Next plus a window of first, last and the pages
  either side of the current one. *Verified* across 11 cases including 500 pages at the
  first, middle and last position: every window is at most 7 elements, always contains page
  1, the last page and the current page, and never renders two elisions in a row.
- **Structured data published `foo.kas.kas` to every search engine.** `jsonld.ts` appended
  `.kas` unconditionally, as `name: <template>${name}.kas</template>`, while callers pass the
  stored name,
  which already ends in `.kas`. So the `ProfilePage` name, its description, its `mainEntity`
  and the homepage `ItemList` all carried a double suffix, on every domain. Every *other*
  site in the codebase guarded with `endsWith`; this one forgot, and nothing failed, because
  a wrong-format string renders perfectly well.
  Root cause was structural: **five independent implementations** of the same two-line
  normalisation — in `domainLookup`, `verifyRequest`, the profile page, the update page and a
  category page — with `jsonld.ts` as a sixth, guardless copy. That is `MIND.md` #17 exactly:
  a format with no owner gets reimplemented per caller until one gets it wrong. Fixed by
  creating that owner, `src/lib/domainName.ts`, and routing all six through it, including the
  server verifier and the search page's suffix-stripping. It is deliberately
  dependency-free — same reason as `signedMessage.ts` — so both the WASM-using server
  verifier and client components can use it. Two behaviour changes fell out: the function is
  idempotent, so applying it at an extra boundary is harmless, and an empty input now stays
  empty rather than becoming `".kas"`, which the server would previously have looked up at
  KNS as though it were a domain.
- **A failed link read let the resources editor delete every link the owner had.** The
  worst bug of the session, and it needed two ordinary-looking decisions to line up.
  `useGetDomainLinks` returned `[]` on error, and the editor gated on `linksLoading` alone.
  A failed read ends the loading state too — just with an empty list that is indistinguishable
  from "this domain has no links". So the editor unlocked, showed a blank row, and because
  `updateLinks` is a **bulk replace** (the request carries the complete desired list and
  anything omitted is deleted), the owner's next save wiped their whole profile. Same class
  as the 2026-09-05 data-loss race, reached by a different route: that one deleted the guard,
  this one made the guard's input lie. Fixed by typing the hook's result as
  `DomainLink[] | null`, which turned every unsafe caller into a compile error — the
  type-checker found seven call sites a comment could not have — and by locking the editor
  when the current links are *unknown*, with copy that says why. `DomainResources` no longer
  renders nothing on failure either: silently showing no links is a confident claim about
  someone else's profile that we are in no position to make.
- **The profile page showed a pink "Likes" row that was permanently "Unavailable".** It read
  `getDomainVoteCount` from `DomainVotesManager`, which has no deployed code, so it failed
  on every domain — directly above the working "Votes: N" that `VotingSection` renders from
  the database on the same page. Two counters, one dead, disagreeing on what the thing is
  even called: the product says *votes* everywhere else, and *likes* is the exact confusion
  that produced `MIND.md` #1. Removed rather than repaired, along with
  `DomainLikeCount.tsx` and `useGetDomainLikeCount.ts` — the real count is already on the
  page, so repairing it would only have produced the same number twice.
- **The dead-file count in `FILES.md` was wrong, twice, in both directions.** Reported as 18;
  the real number is **27 of 129 source files — roughly a fifth of `src/`**. The first count
  came from a bare-name grep, which matches a *local variable* named `walletClient` and the
  line that *defines* `useVerifiedDomains`; eight files were called live on that evidence,
  including `ConnectButton.tsx`, which is dead because `Header.tsx` defines its own
  `ConnectButton` locally. The second miss was transitivity: ten files are reachable only
  through two barrel files that nothing imports, so a single "does anything import me?" pass
  calls all ten live. Fixed by resolving module specifiers and computing reachability from
  the entry points Next loads by path — and by making it `npm run dead:check` rather than a
  number in a document, since a hand-recomputed figure was wrong on both attempts. Recorded
  as a correction under `MIND.md` #18: enumerating from the declaration was necessary and
  not sufficient; the test applied to each entry has to be the real question too.
- **The connect button said "Connect Kasware" to users who were connected.** `isConnected`
  required **both** wallets. Since listings moved to Supabase only the Kaspa L1 wallet
  matters — it holds the key that owns the domain and signs every write — so anyone who
  connected Kasware and then declined or failed the second, EVM prompt saw a button still
  offering to connect, and no Logout, while being perfectly able to list and vote. The app
  looked broken to exactly the users it now serves. Three related fixes in the same place:
  the EVM signer is no longer requested at all when the database is the store (it was a
  second wallet prompt for a capability nothing would use); `setActiveWalletType` no longer
  points `activeAccount`/`activeStatus`/`activeError` at the wallet the app does not read;
  and an EVM connection error is no longer surfaced on a deployment that never uses the EVM
  signer.
- **The categories index rendered an outage as "No categories available right now."** The
  `catch` fell back to `{}`, which is indistinguishable from a genuinely empty catalogue —
  on a site whose entire navigation is categories. The manifest stopped fabricating fallback
  data specifically so callers could tell these apart, and this caller collapsed them again.
  Now three outcomes, with the failure saying plainly that it is a problem on our side.
  *Verified* against the live project with the schema unapplied: the page renders the
  failure state, not the empty one.
- **`VotingSection` had principle #17 live in a single variable.** `effectiveFeeWei` held
  **sompi** on the database path and **wei** on the contract path — 8 decimals versus 18, in
  a variable whose name asserts one of them. It happened to be formatted correctly because
  every read branched on the source, but the next person to compare or format it had no way
  to know which they had. Split: `voteFeeWei` is strictly wei and only read on the contract
  path, the database amount comes from `VOTE_FEE_SOMPI` directly, and the "is it loaded"
  guard is now its own boolean. Also removed a stale comment claiming votes are free.
- **Every domain card showed the fee off by ten orders of magnitude.**
  `Fee Paid: {domain.feePaid} KAS` printed the stored value raw — but `fee_paid` holds
  **sompi**, so a 200 KAS listing displayed as **"20000000000 KAS"** on every browse page,
  search result, ranking and "my votes" card. Fixed, and the fix had a trap in it: the same
  `feePaid` field is **wei** on the contract path (18 decimals vs 8), so formatting one as
  the other is wrong by 10^10 in the other direction. Now formatted by source, with the
  underlying type problem logged in `GAPS.md` — a field whose unit depends on who produced
  it is a bug waiting for its next reader.
- **The owner link on every card pointed at an EVM explorer with a Kaspa L1 address.**
  `frontend.kasplextest.xyz/address/kaspa:qz…` — correct when owners were EVM addresses,
  dead since listings moved to Supabase and the stored owner became the `kaspa:` address KNS
  reports. Now chosen by address shape, and `kas.fyi` for L1 rather than
  `explorer.kaspa.org` because that is the one that actually answered when checked (the
  latter 403s a plain request, so its URL shape could not be confirmed — and a link built
  from an unverified guess is the same class of mistake as a fabricated fallback).
  Also fixed while in there: the card wrapped that `<a>` inside a card-wide `<Link>`, which
  is a **nested anchor** — invalid HTML that browsers resolve inconsistently and screen
  readers announce as one confused control. `stopPropagation` hid the symptom without fixing
  the nesting. The link now covers the card body and the explorer anchor is a sibling.
- **A failed vote read rendered as "Votes: 0" and "Be the first to vote!"** `likesCount`
  started at `0` and `voters` at `[]`, and both `catch` blocks left them there — so a
  database outage on a domain with fifty votes displayed a confident zero, and invited the
  next visitor to **pay 1 KAS to be first**. `MIND.md` #2 again, on the money path this
  time. Both are now `null` for "not known": the count renders as `—`, and the voter list
  says plainly that we could not load it and therefore do not know whether there are any.
  Note what already saved this from costing anyone money: the SA-04 preflight re-checks
  "have you already voted" server-side before the wallet is asked, so a stale `userHasLiked`
  leads to a refusal rather than a wasted fee.
- **`/list-domain` promised features that do not exist, on the page where people decide to
  spend 200 KAS.** It advertised "a dedicated profile with bio, links, image, and
  categories" and being "featured in categories, search, and premium drops". A profile
  renders category, listed status, vote count and links — there is no bio and no image:
  `DomainDataStorage` is referenced only by `useGetDomainData.ts`, which is one of the 18
  files nothing imports (see [`FILES.md`](./FILES.md)), and that contract fails every call
  anyway. "Premium drops" and "curated drops" appear nowhere in the codebase at all.
  Rewritten to list what actually ships — profile links, up to six categories, both editable
  later for free, community voting, and ownership re-checked on every edit. This matters
  beyond accuracy: the refund policy is explicitly undecided, so a promise the product
  cannot keep is a dispute with no agreed resolution. *Verified by build and inspection
  only* — the copy sits behind a wallet-connected branch that cannot be rendered without a
  wallet.
- **The listing button quoted 210 KAS for a 200 KAS fee.** Every other place in the app —
  homepage, `/docs`, `/learn`, `/list-domain`, `/business-plan` — says 200. The one place
  that was wrong was `PickDomainModal`, which is the actual button a user clicks to pay.
  Left over from when the marketing figure was 210 and the contract charged 420; the fee has
  since become a single constant and this was the only caller not reading it. Now
  `formatKas(LISTING_FEE_SOMPI)`, so it cannot drift again.
- **The category picker showed raw slugs.** `PickDomainModal` rendered
  `useGetAllowedCategories().categories`, which is keys — so users chose between
  `realWords`, `999club` and `100kclub` as if those were labels. `options` (key + title) was
  added two sessions ago and this consumer never moved to it. Also: a successful listing on
  the database path produced **no confirmation in the modal at all**, because the success
  block was keyed on `txHash`, which only the on-chain path sets. Now shows the listing with
  a link to its page.
- **`/EcosystemAdmin` told the real administrator "⛔ Access Denied".** `isOwner` was
  `account && owner ? compare : false`, so an owner that could not be *loaded* was
  indistinguishable from an owner that did not *match*. And it can never be loaded:
  `EcosystemFund` at `0x07Cb…4389` has **no deployed code** (verified 2026-09-06 by raw
  `eth_getCode` against `rpc.kasplextest.xyz` — a fifth dead contract, alongside the four in
  the CRITICAL section). So `owner()` always threw, and the page confidently told whoever
  opened it that they were not authorized. Fixed with three states —
  loading / loaded / unavailable — where only `loaded` can produce a denial. The unavailable
  case now names the real cause (nothing is deployed at that address; ethers reports it as a
  decode failure, which reads like a bug in the page) and says plainly that fees are paid to
  a Kaspa L1 treasury and never pass through this contract, so there would be nothing to
  report even if it were reachable.
- **Header search never jumped to a domain, because it looked up the wrong name.**
  `handleSearch` stripped the `.kas` suffix before calling `findDomainByName` — but
  `normalizeDomain` on the server *always appends* `.kas`, so `domains.name` is stored with
  it. The lookup compared `"foo"` against a stored `"foo.kas"`, matched nothing, and sent
  the user to `/search` instead of the domain whose exact name they had just typed. Broken
  on the chain path too, for the same reason. No error, no warning — a feature that had
  simply never worked. Fixed by normalising **inside** `lookupDomain` rather than at the
  call site, to the same rule the server stores by, with a comment on each pointing at the
  other. Also stops pushing the un-suffixed URL, which made the profile page immediately
  redirect, and clears the search box before the round trip rather than after — it used to
  sit there long enough that a second Enter re-ran the same search.
- **The header loaded the entire category manifest on every page view.** Every category,
  every listing, every membership row, client-side, to render a dozen trending names — and
  the paging fix above made it worse, turning one oversized request into roughly twenty at
  the 10,000-listing cap, per visitor, per page. Replaced with `fetchCategoryDomains`, one
  targeted query with a limit. Failure stays silent by design: the strip is decoration, and
  a header that shouts about a database problem on every page is worse than one that shows
  nothing — `/status` is where that belongs.
- **My own build check was reading the wrong part of the output.** While fixing the above I
  grepped `npm run build` for `Compiled successfully|Failed to compile` and got a pass —
  while `tsc --noEmit` was failing on a missing import in the same file. The build prints
  "Compiled successfully" at an early stage and type-checks later, so the narrow grep
  matched the optimistic line and missed the real one. Exactly `MIND.md` #6, self-inflicted.
  Build output is now read in full, and `tsc --noEmit` is treated as the type gate rather
  than a formality.
- **Every "load all domains" read was capped by the server and truncated without an
  error.** `fetchAllDomains`, `fetchCategoryManifest` and `fetchVoteCounts` each issued one
  unbounded `select`. PostgREST caps the rows a single request may return, and a query that
  exceeds the cap comes back **short with no error** — so search would answer "No matching
  domains found" for a domain that exists and is paid for, browse pages would be missing
  listings, and the top-voted ranking would quietly omit whatever fell past the cap. The
  site is capped at 10,000 listings by design, comfortably past any plausible server limit,
  so this was a matter of when rather than if. Fixed by paging explicitly with `.range()`,
  plus a stable secondary sort on `id` — without one, rows sharing a `created_at` can be
  ordered differently between two requests, so paging returns one row twice and misses
  another.
  **The first version of the fix had the same bug at a different cap.** It advanced by a
  fixed page size and treated a short page as the end — so if the server's cap were *lower*
  than our page size (Supabase's `max-rows` is configurable), every page would look short,
  the loop would stop after one, and the result would silently truncate to the cap. Caught
  by a throwaway harness that ran the loop against a fake server at several caps: it
  returned **100 of 10,000 rows** and reported success. Now advances by the number of rows
  actually returned and stops only on an empty page, which is correct for any cap, plus a
  runaway guard for a server that ignores `range` entirely. *Verified*: 0/1/499/500/501/1000/
  1001/10000 rows at a 1000-row cap and 10000 rows at a 100-row cap all return the full set
  contiguously; an error on page 2 rejects rather than returning a partial list as if
  complete. That harness is **not** in the repo — it duplicated the loop rather than
  importing it, and a copy that can drift from the original is the kind of test that passes
  while the real code is broken.
- **Withdrawing a category silently deleted the profile page of every domain listed only
  under it.** `/domain/[name]` decided whether a domain exists by scanning the *category
  manifest* — but `fetchCategoryManifest` filters `is_allowed = true` and skips memberships
  pointing at a disallowed category. So a moderation decision about a **category** 404'd
  paid, active listings whose owners had done nothing wrong, with no error and no
  explanation. Fixed by asking the right question: existence comes from an indexed lookup in
  `domains`, and the category is now only a label — `fetchDomainCategories` deliberately
  returns withdrawn categories too, so the page can still say what the domain is in.
  "Uncategorized" is a fine thing to render; "this domain does not exist" is not. Side
  benefit: a profile view is now a single-row read instead of loading every category.
- **Nearly replaced that bug with a worse one.** The obvious fix was to call
  `findDomainByName`, which returns `undefined` for *both* "not listed" and "couldn't
  check" — so a database outage would have served a permanent 404 for a live domain, telling
  search engines to drop the page and the owner that their paid listing was gone. Caught
  before committing. `lookupDomain` now returns three outcomes (`found` / `not-listed` /
  `unavailable`), and only the store actually saying "not listed" produces a 404; an outage
  gets a temporary error with a link to `/status`. `findDomainByName` remains as a wrapper
  for callers that genuinely can't act on the difference, with a comment saying so. Same
  shape as `MIND.md` #14 — the third state is the one that matters.
- **User-facing copy still said listings were on-chain, and outages blamed a smart
  contract.** Listings moved to Postgres on 2026-09-05 and a copy pass was done then, but it
  missed metadata and error states. `/domains` told users and search engines "Every listing
  is on-chain, verified"; the homepage's Open Graph description said "Showcase your .kas
  domain on-chain"; and both `/domain/[name]` and the category page rendered "Contract
  Unavailable — the smart contract is not responding or not deployed" whenever the
  *database* was unreachable. That last one is worse than cosmetic: it sends anyone
  debugging to a component that isn't in the request path. All corrected to distinguish what
  is genuinely on-chain (the domain, via KNS on Kaspa L1) from what is not (the listing).
  *Verified* against the live project with the schema still unapplied: both pages now render
  "Temporarily unavailable", not a 404 and not a contract error.
- **A paid write was four round trips with a hand-rolled rollback.** Codex's SA-08, and the
  last of the nine. Listing was: validate categories, claim the receipt, insert the domain,
  insert the categories — four separate requests, with a manual `delete` if the last one
  failed, whose own success was never checked while the response told the user nothing had
  been created. Voting was four more. Links were a delete followed by an insert, so a failed
  insert left a profile wiped. Between any two of those the network can drop, and the user
  has already paid. **No amount of application-side sequencing fixes this** — two HTTP
  requests to PostgREST cannot be made atomic. Fixed by moving each into a single Postgres
  function (`create_listing`, `record_vote`, `replace_domain_categories`,
  `replace_domain_links`), which runs in one transaction: either the receipt is consumed and
  the rows exist, or nothing happened. The category allow-list check moved inside too, so it
  is evaluated against the same snapshot as the insert rather than a few milliseconds
  earlier. `claimReceipt.ts` is deleted — with the write atomic there is nothing left to
  release.
  **The dangerous part of this fix, and what guards it:** those functions are
  `security definer`, so they bypass the RLS that makes anonymous writes impossible. Postgres
  grants `EXECUTE` to `PUBLIC` by default and PostgREST exposes every `public`-schema
  function as an RPC endpoint — so left alone, this migration would have handed the
  browser-visible key a way to call `create_listing` directly. The migration revokes from
  `public`/`anon`/`authenticated` and grants only to `service_role`, pins `search_path`, and
  `npm run db:check` now proves the publishable key cannot call any of them.
  Also added: `kaspadomains_schema_version()`, checked by the preflight *before* payment, so
  a deployment whose code is ahead of its database refuses instead of failing at the write —
  which is after the money has gone.
- **My own `db:check` reported the security-critical permission check as OK when it had
  proved nothing.** Caught immediately after writing it, and a straight recurrence of
  `MIND.md` #14 — the same mistake as the `/status` bug from the day before, made while
  writing the checklist about it. PostgREST hides functions the calling role cannot execute,
  so a correctly-revoked function and a function that was never created both come back as
  `PGRST202`. The check read that as "blocked" and printed four green lines against a
  database with no functions at all. Fixed by gating it on the admin-side existence probe:
  if the functions don't exist, the permission result is reported as **inconclusive**, not a
  pass.
- **The wallet was asked to pay before the server had agreed to do anything.** Codex's
  SA-04, and the most serious thing left open after the audit. The browser chose the
  off-chain flow from the **public** Supabase key and called `payFee` immediately; the API
  needs a **different**, server-only key, and could still refuse afterwards for ownership,
  duplicate-listing, already-voted or category reasons. Deploy with a valid public key and
  a missing `SUPABASE_SECRET_KEY` and a listing sent 200 KAS to a route that answered 503.
  Kaspa transactions are irreversible, so that money was simply gone. Fixed by inverting
  the order: `POST /api/domains/preflight` (signed, free) runs write-readiness, KNS
  ownership, target existence, duplicate state and the category allow-list, and only then
  issues a short-lived **payment intent** — HMAC-signed, bound to the action, domain,
  signer and amount. Both paid routes now **require** it, so the flow cannot be skipped,
  and the client pays the amount the *server* quoted rather than its own constant.
  Deliberately not a security boundary: every write still verifies the signature, re-reads
  the KNS owner, re-verifies the payment on-chain and consumes the receipt through the
  global ledger. Removing the intent entirely would make nothing forgeable — it would only
  put users back to paying before finding out. *Verified* in the real runtime, not by
  inspection: an untampered intent is accepted, and a wrong domain, wrong signer, wrong
  amount, wrong action, tampered signature, forged body (swapping a 200 KAS listing claim
  for a 1 KAS vote), empty string and garbage are each rejected; TTL is 10 minutes, longer
  than the 5-minute signature window because the payment happens between the two
  signatures.
- **"My Votes" was permanently empty, and could not have been anything else.** The hook
  read `getVotedDomainIds` from `DomainVotesManager` — a contract with no deployed code —
  and keyed it by the **Kasplex EVM address**, while votes are recorded against the
  **Kaspa L1 address**. Two independent reasons to return nothing. The page then fanned
  out one `useDomainByHash` per result, each of which also hit a dead contract and
  rendered `null` on failure, so even a successful read would have displayed nothing. And
  because the empty case and the failed case shared a branch, the page said "You haven't
  voted for any domains yet" — a confident false statement. Fixed by reading votes from
  Supabase keyed by `kasware.account`, returning whole `Domain` records so no second
  lookup is needed, and separating "no wallet", "loading", "failed" and "genuinely none"
  into four distinct states.
- **"My Domains" showed KNS's marketplace flag and labelled it Listed.**
  `mapDomainAssetToDomain` set `isActive: asset.listed !== undefined` — but KNS's `listed`
  means "for sale on the KNS marketplace", which has nothing to do with being listed on
  KaspaDomains. A domain listed for sale elsewhere appeared as listed here; a domain
  genuinely listed here appeared unlisted. Fixed by asking the two questions separately:
  KNS answers what the wallet owns, Supabase answers what is listed. Unknown is rendered
  as unknown rather than as "not listed" — collapsing them would invite an owner to pay
  200 KAS to list something twice during a database outage.
- **Every Supabase query was untyped, so a renamed column would have failed silently.**
  `getSupabaseReadClient()` returned an untyped `SupabaseClient`, so `row.voter as string`
  compiled whatever the column was actually called and produced `undefined` at runtime —
  a blank cell rather than an error. Fixed by typing both clients against a hand-written
  `Database` in [`database.types.ts`](../src/lib/database.types.ts). Hand-written rather
  than generated because generation needs a live project and the CLI, which CI and a fresh
  clone don't have; `npm run db:check` compares it against a real project and reports drift.
- **`/status` reported "All 6 tables present" while every table was missing.** Found
  immediately after writing it, by disagreeing with `npm run db:check`. The check only
  counted a table as missing on the specific `PGRST205` code — so any *other* error, a
  failed connection included, fell through to "present". A health check that passes when it
  can see nothing is worse than no health check. Fixed so only a successful query proves a
  table exists; anything else reports **unknown**, never OK. The same fix was needed for the
  RLS probe, which was reading any error at all as "writes are blocked".
- **`TypeError: fetch failed` on the server while the browser worked fine.** Not an app
  bug, but it cost real time and will cost it again: Avast (or any TLS-intercepting
  antivirus or corporate proxy) makes Node reject the intercepted certificate chain with
  `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, while the browser trusts it from the OS store. The
  machine had `NODE_EXTRA_CA_CERTS` set, so a shell-launched dev server worked and one
  launched by a tool that didn't inherit the shell environment did not. supabase-js
  flattens the cause away, leaving only `TypeError: fetch failed`. Both `/api/status` and
  `npm run db:check` now name this specific cause when they see that message, and the
  README documents the fix.
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
  random), and array order **does** (link order is meaningful). The subsequent SA-05 fix
  adds the separate one-time-token and profile-revision guarantees that a body digest alone
  cannot provide; see the newest Fixed entry above.
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
