# History

Last updated: 2026-09-06

A dated log of what actually happened during development, in narrative order. This is
broader than [`BUGS.md`](./BUGS.md)'s "Fixed" changelog (which only tracks bug fixes) —
it's the arc of what was built, investigated, and decided each session, so future work
has real context instead of just a snapshot of current state. `git log` is authoritative
for the literal diffs; this file is for the *why* and the *order things were discovered
in*, which commit messages alone don't capture.

Per [`TODO.md`](./TODO.md)'s process note: commit history before 2026-09-04 has no
descriptive messages ("Initial commit", "sdsd", etc.), so it isn't reconstructable here.
This history starts where real, labeled development starts.

## 2026-09-04 — Wallet migration, Next.js 16 upgrade, business framing

- Removed MetaMask as a second required wallet; confirmed Kasware's own EIP-1193 EVM
  provider (`window.kasware.ethereum`) covers Kasplex transaction signing, so a single
  wallet extension now handles both the Kaspa L1 (KNS ownership) and Kasplex (EVM L2)
  sides of every flow. See `ARCHITECTURE.md`'s wallet section.
- Upgraded to Next.js 16 (App Router, Turbopack default), including migrating off
  `next lint` via the official `next-lint-to-eslint-cli` codemod after `eslint.config.mjs`
  broke against `eslint-config-next@16`.
- Sharpened the business plan's framing: the product leads with "pay once, then get SEO +
  per-domain data," not token rewards — a messaging decision, not a contract change (the
  `KDCToken` contract still exists and still mints on votes). See `BUSINESS_PLAN.md`'s
  positioning note.

## 2026-09-05 (morning) — SEO/UX audit pass

A continuous local audit loop (`/loop 8m`) worked through UI/UX, content, and SEO issues
across the site, each verified against the real code rather than assumed:

- Fixed OG image metadata, `robots.txt` blocking the wrong routes, and rebuilt the
  `/domains/top-voted` and `/search` pages (both were stubs or dead code).
- Removed marketplace framing ("Buy Now", fake price/status data) from `/domains` and its
  structured data — direct conflict with the site's own "not a marketplace" positioning.
- Replaced the homepage's **fabricated** "Trending .kas Domains" (a hardcoded array of
  made-up domains) with real vote-count data — the incident that produced
  [`MIND.md`](./MIND.md) principle #2.
- Fixed internal linking/CTAs on `/learn`, `/docs`, `/business-plan`, and both category
  pages (dark theme, breadcrumbs, a real `react-hooks/error-boundaries` lint bug).
- **Found and fixed the entire community voting feature was calling contract functions
  that don't exist** (`getDomainLikeCount` instead of `getDomainVoteCount`, etc.) — see
  `BUGS.md`'s Fixed entry and `MIND.md` principle #1. This is the incident that started
  the "verify against the real ABI" discipline the rest of this history follows.
- Changed the displayed listing price to 210 KAS for marketing/SEO (explicit request)
  while `useListDomain.ts` was changed to read the real `DOMAIN_FEE()` live from the
  contract rather than hardcoding it — intentionally decoupling display copy from the
  real on-chain charge, with the mismatch tracked as a named risk rather than hidden.

## 2026-09-05 (midday) — Splitting TODO.md into focused docs

The audit findings had outgrown a single scratchpad file. Split into
[`BUGS.md`](./BUGS.md), [`GAPS.md`](./GAPS.md), [`LIFECYCLE.md`](./LIFECYCLE.md),
[`SPEC.md`](./SPEC.md), and [`MIND.md`](./MIND.md), each cross-linked; `TODO.md` became a
live index. Also rewrote [`README.md`](../README.md), which had been left as unedited
`create-next-app` boilerplate the entire time — no project description, no link into
`docs/` at all.

## 2026-09-05 (afternoon) — Live-chain verification finds the real state is worse than the ABI suggested

Investigating the one known `DomainLinksStorage.getLinks` → `invalid opcode: MCOPY`
console error, by querying the live Kasplex testnet RPC directly instead of reasoning
from the ABI, surfaced a much bigger picture — the concrete case behind
[`mind/verification-checklist.md`](./mind/verification-checklist.md)'s "ABI-correct isn't
chain-correct" rule (`MIND.md` principle #10):

- **4 of 6 contracts in `contracts.ts` have no deployed code at all** on the live RPC
  (`KaspaDomainsRegistry`, `DomainVotesManager`, `DomainCategoriesStorage`, `KDCToken`) —
  confirmed via raw `eth_getCode`, not assumed. Likely a testnet reset where only 2 of 6
  addresses were ever updated afterward.
- **Every function on the 2 contracts that do exist fails with `invalid opcode: MCOPY`**,
  not just `getLinks` — root-caused against Kasplex's own docs to a compiler/chain
  EVM-version mismatch (Kasplex targets Shanghai; modern `solc` defaults to Cancun+, which
  introduced `MCOPY`).
- Traced the actual code to check whether this could cause real fund loss through the
  app's own UI: it currently can't, because `useListDomain.ts`, `useSetDomainCategories.ts`,
  and `VotingSection.tsx` all read a live value from the broken contracts before
  constructing any payable transaction, and that read fails cleanly first — fragile,
  accidental protection, not a guarantee, but enough to correct an earlier overstated
  "funds at risk today" claim.
- Wrote [`KASPA_DEVELOPMENT.md`](./KASPA_DEVELOPMENT.md): current Kaspa/Kasplex/Igra
  ecosystem state (researched against live sources, not training-data memory) and a
  phased plan for fixing and growing the on-chain layer.
- Replaced the raw RPC decode errors these three flows would otherwise show with an
  honest "temporarily unavailable" message — the one code change from this pass that
  shipped immediately, being low-risk and high-value.
- Created the [`mind/`](./mind/) directory: checklists (verification, fallback-auditing,
  testnet-reset context) that turn `MIND.md`'s narrative principles into steps to
  actually run.

## 2026-09-05 (evening) — Fixed the fabricated-fallback bug found while tracing the above

Tracing whether real funds were at risk (above) led to opening
`app/domain/[name]/page.tsx` and finding its well-written "Contract Unavailable" honest
error UI was dead code — verified live in a browser (`/domain/test.kas` rendered a
misleading generic 404 instead). Root cause: `loadCategoriesManifest()` — the shared data
function ~11 files across the app call — caught any contract failure and returned a
**hardcoded fake domain** (`"example.kaspa"`) instead of surfacing the error, which is
why the honest error path never ran. This is the same anti-pattern as the trending-domains
incident above, one layer deeper — fixing one display component hadn't eradicated it from
the shared function everything else calls through.

Fixed by removing the fabricated fallback and checking all 11 call sites individually for
how each should degrade honestly on failure, rather than assuming they'd all cope with a
new rejection. Also deleted a fully dead, unused duplicate implementation
(`src/hooks/categories/useCategoriesData.ts`). Verified with a real `npm run build`
(exit 0) against the still-broken live contracts — the build log shows the new specific
error messages being logged instead of silent fake success, and the generated
`sitemap.xml` contains only real routes. A stale pre-fix dev-cache artifact was found to
have actually prerendered a `/domain/example.kaspa.kas` page, confirming this was a real,
live-traffic-facing bug, not a theoretical one. Full detail in `BUGS.md`'s Fixed section.

## 2026-09-05 (late) — Lint debt cleared, and auditing what that actually bought

A separate commit (`0a2ae00`) hardened the listing flows and swept the `react-hooks` lint
debt across ~11 files; `npx eslint .` now reports 0 problems over 110 files. That sweep
also resolved the long-standing decide-or-delete calls: `domains/new-listings/page.tsx`
became a redirect to `/list-domain`, and `DomainForm.tsx` a deprecated stub — both chosen
so a placeholder flow can never look real. `useListDomain.ts` also stopped retrying after
a transaction hash exists, which had risked charging the listing fee twice.

Rather than take the green lint run at face value, each refactor in that sweep was read
for **removed conditions** — which turned up one real regression (the resource editor's
dropped `linksLoading` guard, a latent data-loss bug that would have wiped a domain's
links on save once the contract is redeployed) and a handful of cosmetic "fixes" that
silence the rule without changing behaviour. That produced `MIND.md` principle #13.
Fixed alongside it: `/search` was rendering an outage as "No matching domains found",
plus a stale-response race; and `useGetDomainLinks` could sit in `loading` forever.
`CustomizeDomainForm.tsx` — 98 lines, entirely commented out — was deleted.

## 2026-09-05 (evening) — user data moved off-chain to Supabase

Owner decision, made because the on-chain product could not run: four of six contracts
have no deployed code and the other two fail every call. Listings, votes, categories and
resources now live in Postgres, read through `src/data/supabaseSource.ts` and written
through three signed HTTP endpoints. The contract path was kept rather than deleted and
takes over whenever Supabase is unconfigured, so unsetting two env vars restores the
previous behaviour exactly.

The interesting part was authorisation. On-chain, the registry contract was what stopped
someone listing a name they don't own; a database row has no such property. Kasware's
`verifyMessage` turned out to be wallet-side only, so proving control of a Kaspa L1
address server-side would mean reimplementing Kaspa's personal-message hashing and address
encoding — blind, with no wallet reachable from CI. A verifier that wrongly *accepts* is
worse than an admitted gap, so that was not hand-rolled. Instead the server proves what it
genuinely can (control of a Kasplex EVM address, via `ethers.verifyMessage`), reads the
authoritative owner from KNS server-side so the client can't assert ownership, and stores
every row with `ownership_verified = false`. The honest consequence — someone can occupy a
listing row for a domain they don't own, though it will still display the true KNS owner —
is written down rather than papered over.

Two commercial facts fell out of the migration and are recorded in `BUSINESS_PLAN.md`
rather than left implicit: nothing collects the 420 KAS listing fee or the 6 KAS vote fee
any more, so both are free; and listings are no longer permanent or on-chain, which
contradicts copy still live on the site.

## 2026-09-05 (night) — deciding what the data layer should eventually be

With Supabase running but authoritative-by-accident, the question became whether Kaspa L1
covenants could take over. Research against `docs.kaspa.org/toccata` and
`/programmability`, plus live probing of the KNS API, produced a clearer answer than
expected in both directions.

In favour: KNS domains are genuinely on-chain assets (the owner endpoint returns an
inscription ID, `<txid>i0`), and on L1 the owner's key is the signing key — so ownership
becomes a native `checkSig` instead of the cross-chain inference we cannot make on Kasplex.
That closes the `ownership_verified` gap rather than shrinking it. Against: a covenant
cannot *look up* ownership, since introspection reads the current transaction rather than
historical state; and Based Apps, the model shared-state vote counters belong to, are still
"in construction".

The decisive realisation was that "covenants instead of a database" is the wrong framing. A
UTXO set answers no queries — no category browse, no ranking, no search — so every
UTXO-chain app runs an indexer, and an indexer is a database. KNS itself is the proof:
fully on-chain assets, read through a REST API in front of an index. So the choice was
never database-or-chain but **which one is believed**. The agreed shape is authoritative
chain with a disposable, rebuildable index, votes explicitly off-chain at a stated
boundary, and resource payloads anchored by hash rather than stored on-chain, because every
transition costs a wallet prompt and a fee.

Nothing was built. The blocker recorded before any of it is worth starting: a covenant
pinned to the owner's pubkey keeps trusting them after the KNS domain is sold, and no
on-chain signal says otherwise.

## 2026-09-05 (late night) — owner-only writes, enforced rather than documented

The owner's requirement was blunt: only a domain's owner may log in or change anything.
What existed did not satisfy it — the links route authorised whoever *created* the listing,
and anyone could create one — so the gap that had been carefully written up in `GAPS.md`
had to actually be closed.

The earlier decision not to hand-roll Kaspa signature verification still held; what changed
was checking whether it needed hand-rolling at all. It did not: `kaspa-wasm`, the official
rusty-kaspa WASM bindings, publishes both `verifyMessage` and `PublicKey.toAddress`. Those
were probed empirically before being adopted — sign/verify round-trip, address derivation
matching the keypair's own address, tampered message rejected, wrong key rejected — rather
than trusted from documentation.

That made the real fix available: sign with the **Kaspa L1 key** instead of the Kasplex EVM
key. The L1 key is the one that owns the domain on KNS, so deriving its address and
comparing against KNS closes the loop that two different keypairs had made impossible.
Ownership is re-checked per request rather than stored, so a transferred domain follows its
new owner and the previous one loses access — the `submitted_by` check was removed for
exactly that reason.

Two consequences worth noting. The verifier pulled the WASM module into the client bundle
and broke the build, because a client file imported the message builder from the server
module; the format now lives in its own dependency-free module, which is also the right
shape — verification code has no business in the browser. And switching identities meant
the vote-status check was comparing against the wrong address entirely, which would have
left the button enabled until the server rejected the duplicate.

The residual risk is narrow and fails in the safe direction: Kasware's signing convention
is assumed to match the SDK's and is untested against a real extension. A mismatch rejects
legitimate owners rather than admitting impostors.

## 2026-09-06 — Codex's audit, answered; and the parts of the migration that were never finished

Codex ran a security audit of the paid flows and found nine issues. Six were fixed
immediately: a signature that authorised any body, a fee receipt anyone could lift off the
public ledger and spend as their own, one receipt funding two different actions, an
unbounded CSP log sink, an unenforced category allow-list, and two vulnerable `ws` copies.
The receipt findings were the interesting pair — not because the code was subtle, but
because both were invisible from inside the code. `verifyPayment` checked *that* the
treasury was paid and never *who* paid; and single-use was enforced by two separate unique
constraints that knew nothing about each other, so the cheap action could consume the
expensive receipt. Neither shows up unless you ask "what does an attacker control here?",
which is exactly what an audit is for and what writing the code is not.

Then a broader look at the Supabase migration, which turned out to have been declared done
while three things were still half-moved. "My Votes" had never left the contracts: it read
a dead contract, keyed by the *Kasplex EVM* address, while votes are recorded against the
*Kaspa L1* address — two independent reasons to return nothing — and then told the user
"You haven't voted for any domains yet", because the empty case and the failed case shared
a branch. "My Domains" read KNS's marketplace `listed` flag and rendered it as *Listed
here*. And every query was untyped, so a renamed column would have produced blanks rather
than an error.

The lesson that generalises: **a migration is not finished when the new store works, it is
finished when the old paths are gone.** Each of these compiled, rendered, and looked fine.
What gave them away was asking, of each page, "which store is actually answering this?"

Two things caught during verification are worth recording because both were mine. The
`/status` page I had just written reported "All 6 tables present" while every table was
missing — it counted a table as missing only on one specific error code, so a failed
connection fell through to "present". A health check that passes hardest when it can see
least is worse than none, and it was caught only because `npm run db:check` disagreed with
it. Second, the reason the connection was failing at all: TLS-intercepting antivirus, which
Node rejects and the browser does not, surfacing as an opaque `TypeError: fetch failed`
because supabase-js drops the cause. The split — browser fine, server broken — is a
genuinely confusing signature, so both the status route and `db:check` now name it.

Finally SA-04, the audit's most serious finding and the one that could actually cost
someone money: the browser paid *before* the server had agreed to do anything, and chose
that path from the public Supabase key while the server needs a different, server-only one.
Fixed by inverting the order — a free, signed preflight runs every check and issues a
short-lived HMAC payment intent, and the paid routes require it. Deliberately not a
security boundary: every check is re-run at write time, so deleting the intent would make
nothing forgeable. Its only job is that the wallet prompt is the *last* uncertain step
rather than the first.

## 2026-09-06 (later) — deleting the thing that was causing the bugs

The owner removed the Kasplex contract path and the 10,000-listing cap. The cap was copy.
The contracts were 34 files.

What makes this worth recording is not the deletion, it is what the deletion revealed. The
contract path had been kept as "a fallback, in case the contracts come back" — and it had
never worked: six of eight addresses had no deployed code, the other two failed every call.
So it answered nothing, ever. But it was not inert. Because every read and write carried two
branches and one was never exercised, it had *directly caused* five bugs that were already
sitting in `BUGS.md`: the fee rendered 10^10 too large because `feePaid` meant sompi on one
branch and wei on the other; "My Votes" permanently empty because votes were keyed by the
EVM address on one branch and the L1 address on the other; a counter reading the dead
contract and showing "Unavailable" above a working number; an admin page telling its own
administrator "Access Denied"; and a connect button demanding two wallets when one mattered.

Five bugs in the *live* path, caused by the shape the dead path forced on it. That became
`MIND.md` #20: a dead fallback is not free — ask when it last succeeded, and if the answer
is "never", it is a liability with a reassuring name.

The same session produced #19, from a different direction. Principle #2 — an empty result
and an error are different answers — has been in `MIND.md` since the beginning, and had by
then been violated **eight times**, several of them in the same session as a fix for another
instance of it. That is enough evidence to stop trusting a written rule: it became a lint
rule instead. Documentation is a request; only a check is a constraint.

Afterwards, a sweep found what removals always leave behind — conditionals whose remaining
branch no longer means what it says. `useTrendingDomains` still had a "chain fallback" that
called a now-Supabase-only function, so the branch meant to avoid Supabase loaded the entire
manifest from Supabase. And a review of the last unexamined components found the worst
non-money bug of the week: **nine of the sidebar's nineteen category links pointed at
categories that do not exist**, on every page. Nothing could have caught it — a link is a
string until someone clicks it — and it was found only by enumerating from `schema.sql`'s
seed list and diffing. The fix was to derive the list from the database rather than correct
nine strings.

Finally, `docs/CODEX-TODO.md`: a queue and an explicit path-ownership table between the two
agents, made ground rule 0. Two near-collisions and one actual one (an import removed from a
file the other had open) were enough to stop relying on messages that are easy to miss.

## Related docs

- [`BUGS.md`](./BUGS.md) — the bug-specific version of several entries above, with full
  technical detail (file/line references, exact error text, verification steps).
- [`MIND.md`](./MIND.md) — the operating principles this history's incidents produced.
- [`mind/`](./mind/) — checklists derived from those principles.
- [`KASPA_DEVELOPMENT.md`](./KASPA_DEVELOPMENT.md) — the ecosystem research and forward
  plan from the 2026-09-05 afternoon session.
- [`TODO.md`](./TODO.md) — live index and current backlog.
