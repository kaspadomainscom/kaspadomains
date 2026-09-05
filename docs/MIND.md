# Mind

Last updated: 2026-09-05

How to think about working on this codebase — principles earned the hard way, each
backed by a real incident. Read this before making changes, especially anything that
touches a contract call or a hardcoded number.

Each principle below has the same shape, so it works like a skill definition, not just a
story: a **Purpose** (why it exists, one sentence), a **Mechanic** (the concrete check or
action that operationalizes it, one sentence), then the incident and rule in full for
context. If you only have time to read one line per principle, read the Purpose column
below; if you're about to do the thing a principle is about, its Mechanic line (or the
matching file in [`mind/`](./mind/)) is the actual step to run.

## Standing command: "expand your mind"

**Purpose**: keep this file growing with the codebase instead of going stale the moment
a session ends.
**Mechanic**: when told "expand your mind" (or a clear variant of it), treat it as an
explicit instruction to upgrade this file right now — not just re-read or summarize it.

This phrase is a standing command tied specifically to this file. When given it, actually
do the following, in order:

1. Check this file's "Last updated" date against [`HISTORY.md`](./HISTORY.md) and
   [`BUGS.md`](./BUGS.md)'s Fixed section for anything that happened since — a fix, a bug,
   a docs session, a live-chain finding — that isn't distilled into a principle here yet.
2. For each genuinely new, generalizable lesson found (not just a detail an existing
   principle already covers), add a new numbered principle in the established
   Purpose/Mechanic/incident/rule format, and add it to the Quick reference table below.
3. If an existing principle gained a real new instance (a recurrence, a second file with
   the same bug class), append it to that principle under its own dated sub-heading
   rather than creating a near-duplicate principle.
4. If a principle's mechanic is concrete enough to run as a repeatable checklist, add or
   update the matching file in [`mind/`](./mind/) and cross-link it both ways; update
   [`mind/README.md`](./mind/README.md)'s index table too.
5. Bump the "Last updated" date at the top of this file (and of any `mind/` file you
   touched).

This isn't only for the literal phrase — this file is meant to be upgraded continuously,
as a natural byproduct of any session that surfaces a real, generalizable lesson (see
`HISTORY.md` for examples of this already happening without being asked, e.g. principles
#10, #11, and #12 all came from a single 2026-09-05 session, not a separate request).
"Expand your mind" just means: do that pass explicitly and thoroughly, right now, instead
of waiting for it to happen incidentally as a side effect of other work.

## Quick reference

| # | Principle | Purpose |
|---|---|---|
| 1 | Verify the ABI first | Don't call a function that doesn't exist because its name sounded plausible |
| 2 | Don't fabricate data | An honest empty/error state is never a trust problem; fake-looking data always is |
| 3 | Distinguish loading from error | A silent failure and a slow success must never look identical |
| 4 | "Not a marketplace" constrains code | A positioning statement has to bind copy, schema, and data models, or it's decoration |
| 5 | Grep isn't a complete audit | Source-text search misses entities, concatenation, and rendered output |
| 6 | Read full output, not the tail | A stable count can hide a completely different set of failures underneath it |
| 7 | Verify ecosystem claims live | Fast-moving stacks make yesterday's "current" claim today's wrong one |
| 8 | Report blockers, don't guess | A wall you can't safely get past is a finding, not a decision to make alone |
| 9 | Never execute money-moving actions | Some mistakes here can't be undone by writing better code afterward |
| 10 | ABI-correct isn't chain-correct | A passing type-check proves shapes match, never that a call succeeds |
| 11 | One catch can't report two failures | A shared error path silently picks the wrong story for at least one of them |
| 12 | Audit every caller before shipping a shared fix | A safe-looking one-line change can break n other places that were never checked |

## 1. Never trust a hardcoded value against a live contract — verify the ABI first

**Purpose**: prevent shipping a call to a function that simply doesn't exist.
**Mechanic**: before writing or trusting any `readContract`/`writeContract` call, `grep`
the real ABI in `src/abis/*.json` for the exact function name.

**The incident**: the entire community voting feature — the "Vote to this domain" button
on every domain page, the like counter, `/domains/my-votes` — called contract functions
that simply don't exist (`getDomainLikeCount` instead of the real `getDomainVoteCount`,
`likeDomain` instead of `voteDomainByHash`, a `DomainLiked` event instead of the real
`DomainVoted`). It had never worked, possibly since the day it was written. Nobody caught
it because the code *looked* plausible — the names were reasonable guesses, just wrong.

**The rule**: don't infer a function name from a similarly-named one elsewhere, don't
assume the existing code got it right, don't assume a "likes"-sounding name means
"votes" was the same thing under a different label. See [`SPEC.md`](./SPEC.md) for the
verified table this produced, and
[`mind/verification-checklist.md`](./mind/verification-checklist.md) for the full
step-by-step version of this mechanic.

## 2. Don't fabricate data — an empty/error state is always better than a fake one

**Purpose**: a placeholder dressed up as real content is a trust problem; an honestly
labeled empty state never is.
**Mechanic**: when real data isn't available, return/render a real "no data yet" or
"unavailable" state — never a hardcoded value shaped like genuine data.

**The incident**: the homepage's "Trending .kas Domains" section was a hardcoded array
of made-up domains with made-up vote counts. It looked complete and polished. It was
lying — clicking through would 404. Nobody could tell it was fake by looking at the
rendered page; you had to read the source.

**The rule**: a placeholder that's honestly labeled as a placeholder is fine; a
placeholder dressed up as real content is not a design choice, it's a trust problem.

**Recurrence (2026-09-05), and how it was actually fixed**: the same pattern turned up
again, one layer deeper. `loadCategoriesManifest()` — the single shared function ~11
files across the app call for domain/category data — caught *any* failure and returned a
hardcoded fake domain (`"example.kaspa"`) instead of surfacing the error. Fixing the one
display component that hit this before (the homepage ticker) hadn't eradicated the
pattern, because it was never really about that one component — it was baked into the
shared data-loading function everything else calls through. Worse,
`app/domain/[name]/page.tsx` already had a correctly-written, honest "Contract
Unavailable" error state ready to handle exactly this case — it was dead code, because
the error never reached it. **Fixed the same day**: removed the fabricated fallback,
audited and fixed all 11 real call sites individually, deleted a fully dead duplicate
implementation, and verified with a real `npm run build` that the failure is now honestly
logged and the app degrades gracefully instead of faking success. Full trace in
[`BUGS.md`](./BUGS.md)'s Fixed section. **Extra rule this added**: a fallback-on-error
pattern is worth an extra look at *every* shared/central data function, not just the
display components built on top of it — see
[`mind/fallback-audit-checklist.md`](./mind/fallback-audit-checklist.md) — and if a
caller already has honest error-handling code for a failure mode that never seems to
fire, check whether something upstream is quietly preventing that error from ever
arriving.

## 3. Loading and error states need to be visually distinguishable

**Purpose**: a feature that has been broken for months must not look identical to one
that's simply loading slowly.
**Mechanic**: track loading/success/error as three distinct states, never `null`
overloaded to mean two different things.

**The incident**: `DomainLikeCount` used the literal string `'Loading...'` for both "still
fetching" and "fetch failed" — so a permanently broken feature looked identical to a slow
network. This is *why* the voting bug in principle #1 went unnoticed for so long: the
failure mode was silent by construction.

**The rule**: if a piece of state can fail, it needs to be able to *say* it failed —
applied again in the 2026-09-05 UX pass on `useListDomain.ts`, `useSetDomainCategories.ts`,
and `VotingSection.tsx`, replacing a raw RPC decode error and a button that stayed
clickable forever with an explicit "temporarily unavailable" state.

## 4. "We are not a marketplace" is a real constraint on copy and data shape, not just a line in `/docs`

**Purpose**: a positioning statement is worthless if it doesn't constrain what the code
is actually allowed to do.
**Mechanic**: when adding a domain-related feature, ask whether it implies a sale — in
copy, in schema.org vocabulary, or in the data model — not just whether it *says* "sale."

**The incident**: `/domains` branded itself "kaspadomains Market" with a "Buy Now" button
backed by entirely fake price/status data (`Domain` has no such fields — they silently
defaulted). The structured data (`getDomainJsonLd()`) used schema.org's `Product`/`Offer`
vocabulary — the literal shape search engines and shopping aggregators use to detect
purchasable listings — on every single domain page. Both directly contradicted the
explicit, repeated "we don't sell domains" positioning elsewhere on the same site.

**The rule**: "not a marketplace" constrains what schema.org types are legitimate to use,
what UI copy ("Buy," "Sold," "For Sale") is allowed anywhere, and what data models are
appropriate — it's an architectural constraint, not decoration.

## 5. A plain-text grep is not a complete audit

**Purpose**: a source-text search only proves the literal string isn't there — not that
the *thing* isn't there.
**Mechanic**: after a text-based grep pass, also check rendered output via a running dev
server, not just source.

**The incident**: a grep for `"Buy Now"` (with a literal space) missed the sitewide
header ticker's `Buy&nbsp;Now` — the exact same phrase, but split by an HTML entity
inside JSX source.

**The rule**: entities, string concatenation, and template literals all defeat naive
greps — treat a clean grep result as a lead, not a conclusion.

## 6. Check the full lint/build output, not just the tail

**Purpose**: a stable summary number can hide a completely different set of failures
underneath it.
**Mechanic**: before claiming "same count as before" or "nothing new," run a real
`grep -c` or full-file diff — never eyeball a `tail`-truncated log for that claim.

**The incident**: several iterations in a row reported "same pre-existing N errors,
nothing new" based on `npm run lint 2>&1 | tail -N`. When one iteration finally grepped
the full output, the real picture was different — more files were affected than the tail
had ever shown, and a genuinely new, fixable issue (`react-hooks/error-boundaries`) had
been hiding in the untruncated middle of the output the whole time.

**The rule**: `tail` is fine for a quick sanity check, never for a claim about totals or
"nothing changed."

## 7. Verify framework/library/ecosystem claims against current sources, not memory

**Purpose**: fast-moving ecosystems make a "current" claim from memory wrong within
months, sometimes weeks.
**Mechanic**: for anything version- or ecosystem-specific, search current sources and
note the date checked — never state it from training-data recall alone.

**The incidents**: the removal of `app/**/head.tsx` as a Next.js convention, the exact
migration path off `next lint` in Next 16, and Kasware's EIP-1193 EVM-signing support were
all confirmed against live documentation before being acted on. In one case (the
KCC-0020 request), the same discipline produced the opposite result: research showed the
requested change didn't apply to this codebase's architecture at all, and the right move
was to *not* act and instead document why. Repeated at larger scale in
[`KASPA_DEVELOPMENT.md`](./KASPA_DEVELOPMENT.md) (2026-09-05): Kasplex's mainnet launch,
its Shanghai EVM target, the Toccata hard fork, and Igra Network's audited mainnet were
all researched fresh rather than assumed — and the Shanghai/Cancun mismatch that came out
of that research is the confirmed root cause of principle #10's MCOPY incident.

**The rule**: this ecosystem (Kaspa, Kasplex, Next.js, ethers/viem) changes underneath
what any training data would say — see
[`mind/verification-checklist.md`](./mind/verification-checklist.md) §4.

## 8. A blocked or impossible request is a finding to report, not a guess to make

**Purpose**: silently guessing past a real constraint hides the tradeoff from the person
who's actually allowed to make it.
**Mechanic**: when a request hits a real technical/safety wall, state the wall plainly,
explain why, and let the human decide — then document whatever they decide.

**The incidents**: "change the listing price to 210 KAS" and "admin can change the price
at any time" both ran into the same hard fact — `DOMAIN_FEE` is a contract constant with
no setter, so the *real* price literally cannot change without a new contract deployment
(which needs Solidity source this repo doesn't have, real funds, and is irreversible).
Rather than silently doing a partial, misleading fix or refusing outright, the actual
constraint was explained, the user made an informed call (display-only, for SEO), and the
resulting mismatch was tracked as an explicit, named risk rather than hidden.

**The rule**: don't paper over the gap and don't just decline — surface it, then record
the decision so the tradeoff isn't silently forgotten later.

## 9. Money-moving and irreversible actions get flagged, not executed

**Purpose**: some categories of mistake can't be fixed afterward by writing better code.
**Mechanic**: treat deploying a contract, transferring funds, or any real-KAS-spending or
permanent on-chain action as categorically out of scope for autonomous action — full
stop, regardless of how straightforward the code change looks.

This applies even when asked directly ("admin can change price at any time" → correctly
identified as requiring a new deployment → not attempted). It applies to the still-open
2026-09-05 finding that 4 of 6 contracts have no deployed code and 2 more fail every call
— the fix needs correct addresses and/or a redeploy, and guessing at either is exactly
the kind of action this principle rules out. Frontend/docs changes that only ever *read*
from contracts, or that make failure states more honest without changing what gets
written on-chain, are fine to iterate on freely — see principle #2's 2026-09-05 fix for
an example of real, safe, non-money-moving engineering work that was still worth doing
while the on-chain blocker remains unresolved.

## 10. ABI-correct isn't the same as chain-correct — verify against the live RPC, not just the ABI file

**Purpose**: a passing type-check only proves the shapes match — never that the call
actually succeeds against the real, currently-deployed chain state.
**Mechanic**: before calling something "fixed" or "working," confirm the target address
has code (`eth_getCode`) and that a real `eth_call`/simulation against the live RPC
succeeds — not just that TypeScript compiles and the function name matches.

**The incident**: the fix in principle #1 verified function names against
`src/abis/*.json` and shipped it as "Fixed" — a real improvement, but never actually
confirmed against the live chain. A later pass (2026-09-05) called `eth_getCode` directly
against the RPC the app itself uses and found `DomainVotesManager` (along with
`KaspaDomainsRegistry`, `DomainCategoriesStorage`, and `KDCToken`) has **no deployed code
at all** at its configured address — the ABI-correct fix was calling a contract that
doesn't exist. Separately, `DomainLinksStorage.updateLinks` — credited as a real, working
write in the same "Fixed" list — turned out to revert with `invalid opcode: MCOPY` on
every single call, an EVM-hardfork mismatch (Kasplex targets Shanghai; the deployed
bytecode was compiled for Cancun+) invisible from the ABI or the TypeScript types. Both
were fund-safety-relevant (`payable` functions), not just cosmetic.

**The rule**: a static, offline check (grep the ABI) catches wrong-name bugs; it cannot
catch wrong-address or wrong-EVM-version bugs, which need a live network round-trip. Full
step-by-step mechanic in
[`mind/verification-checklist.md`](./mind/verification-checklist.md).

## 11. One catch block can't honestly report two different failures

**Purpose**: collapsing two semantically different failure reasons into one message
guarantees the wrong story gets told for at least one of them.
**Mechanic**: when a `try` block can fail for more than one distinct reason, either
separate them into their own `try`/`catch` scopes, or check *what* failed before
deciding what to tell the user — never let one `catch` speak for every possible cause.

**The incident (2026-09-05)**: `app/domain/[name]/page.tsx`'s `generateMetadata` wrapped
both the manifest load *and* Next's own internal `notFound()` throw (used when a domain
legitimately doesn't exist) in the same `try`/`catch`. Both landed on the same "Contract
Unavailable" metadata title — meaning a perfectly normal 404 for a name nobody ever
listed got mislabeled as a system outage, and vice versa. This is the metadata-layer
sibling of the dead-code bug in principle #2: same file, same root cause shape (a shared
catch swallowing a distinction that mattered), different manifestation.

**The rule**: separate the load (which can genuinely fail) from the "is it here"
check (which can legitimately say no) into different scopes, so a real failure and a
real absence never share a message.

**Found again, same day, second file**: the sibling category page
(`app/domains/categories/category/[category]/page.tsx`) had the identical conflation in
its page body, not just its metadata function. Both fixed the same way: split into a
"contract failed to load" branch (honest message) and a "genuinely not found" branch
(real `notFound()`) — see `BUGS.md`'s Fixed section for both.

## 12. Fixing a shared function isn't done until every caller is checked

**Purpose**: a one-line change to a widely-called function's failure behavior can
silently break, or silently fail to help, every caller that was never actually looked at.
**Mechanic**: before changing what a shared function does on failure (or any change to
its contract with callers), `grep -rl functionName src/` and check every result
individually — don't assume they'll all cope the same way.

**The incident (2026-09-05)**: fixing principle #2's `loadCategoriesManifest()`
recurrence meant more than deleting the fake fallback — that function had 11 real
callers (`app/page.tsx`, `app/domains/page.tsx`, `app/domains/categories/page.tsx`, a
category page, the domain profile page, the sitemap route, `topVotedDomains.ts`,
`jsonld.ts`, the header, and `domainLookup.ts`'s two exports), each with a different
existing error-handling shape — some already degraded gracefully, several had no
handling at all and would have crashed a route (one of them, the sitemap, at build time)
the moment the function stopped silently succeeding. Each was checked and given an
explicit, honest degraded state individually; none were assumed safe by default.

**The rule**: "the fix compiles" is not "the fix is done" for a function anything else
depends on — the caller list is part of the fix's actual scope, not an afterthought to
check if something breaks later. See
[`mind/shared-function-change-checklist.md`](./mind/shared-function-change-checklist.md)
for the concrete search-and-check steps this mechanic runs.

## Related docs

- [`mind/`](./mind/) — working checklists that turn the principles above into concrete
  steps to run (verification, fallback-auditing, shared-function changes, testnet-reset
  context), for when you're about to do the thing a principle is about, not just remember
  why it matters.
- [`SPEC.md`](./SPEC.md) — the verified ground truth principle #1 depends on.
- [`BUGS.md`](./BUGS.md) — the incidents behind these principles, in full, including how
  each was actually fixed where it has been.
- [`GAPS.md`](./GAPS.md) — decisions flagged rather than guessed at (principle #8).
- [`HISTORY.md`](./HISTORY.md) — the dated narrative these principles were extracted from.
