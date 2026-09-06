# Mind

Last updated: 2026-09-07 (profile-write concurrency review)

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

## Standing practice: keep `FILES.md` current

**Purpose**: [`FILES.md`](./FILES.md) is the map — every file, what it does, whether it is
actually live, and what is outstanding. A map that lags the territory is worse than none,
because people trust it and stop looking.

**Mechanic**: **update `FILES.md` in the same change that makes it wrong.** Not afterwards,
not "next session". Specifically, before finishing any piece of work, ask:

1. **Did I add a file?** Add it to its section with a purpose and a status marker.
2. **Did I delete one, or make one dead?** Move it to the dead list, or out of it. A file
   whose last importer just disappeared is now dead and nothing will tell you.
3. **Did a status change?** ⛔ → ✅ when something starts working, ✅ → 🟡 when a limitation
   appears, 🔒 → ✅ when the blocker clears.
4. **Did I finish something on the TODO, or discover something new?** Update section 9 —
   including moving an item between *blocking*, *owner decision* and *engineering* when its
   nature changes.
5. **Did the "where the project stands" summary just become stale?** It is the first thing
   anyone reads; a stale one misdirects every reader after it.
6. **Bump `Last updated`.**

**Why this is a standing rule rather than a nice-to-have**: `FILES.md` exists because
nobody could answer "which of these 128 source files are live?" — and the answer turned out
to include 27 dead files — a fifth of `src/` — and a contract count that had been wrong in
every doc for two days.
That is what an unmaintained map costs. The same pass produced principle #15: a migration
ends when the old paths are gone, and the only way to know they are gone is to have looked
at every file recently.

**This applies to every agent working in this repo, not just whoever wrote it.** If you
touch the codebase, you own the part of the map you moved. See
[`../AGENTS.md`](../AGENTS.md) for the work split.

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
| 13 | A linter going quiet proves nothing | A guard deleted and a guard satisfied look identical in a green lint run |
| 14 | A check that can't see must not report OK | A monitor is most dangerous when it goes green precisely because it observed nothing |
| 15 | A migration ends when the old paths are gone | The new store working proves nothing about the pages still reading the old one |
| 16 | Irreversible steps go last | Once money has moved, every check you hadn't run yet is a check the user pays for |
| 17 | One owner per shared format | Two sides agreeing informally on a format fail silently, because a wrong form still parses |
| 18 | Enumerate from the source of record | An audit is only as complete as the list it started from, and usage is never that list |
| 19 | A repeated violation needs a mechanism | Documentation is a request; only a check is a constraint, and the recurrence count tells you which one you need |
| 20 | A dead fallback is not free | An untaken branch is never exercised, so it stops being a safety net and becomes the place bugs hide |
| 21 | A one-time token is not a version check | A replay guard says “only once”; it does not say the editor was based on the state it is replacing |

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

**Extension (2026-09-06): product copy is a claim, and claims get verified.**
`/list-domain` -- the page where someone decides to spend 200 KAS -- advertised "a dedicated
profile with bio, links, image, and categories" and "featured in categories, search, and
premium drops". A profile renders category, listed status, vote count and links. There is no
bio and no image: `DomainDataStorage` is referenced only by a file nothing imports, and its
contract fails every call. "Premium drops" appears **nowhere in the codebase**. Nobody lied;
the copy simply outlived the plan.

The rule: treat a sentence in the UI exactly like a comment claiming a function's behaviour
-- check it against the code, especially on a page that asks for money. And note the
compounding risk: the refund policy is an unmade decision, so a promise the product cannot
keep is a dispute with no agreed resolution.

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

**Recurrence (2026-09-06)**: I grepped `npm run build` output for
`Compiled successfully|Failed to compile`, got a match on the first, and called it green --
while `npx tsc --noEmit` was failing on a missing import in the file I had just edited. Next
prints "Compiled successfully" at an **early** stage and type-checks later, so a narrow grep
matches the optimistic line and never reaches the real one. The tail was fine; the middle
was not. Filtering output is a way of reading less of it, which is the exact failure this
principle names -- and knowing the principle did not stop me, because the grep *felt* like
being rigorous.

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

## 13. A refactor that satisfies a linter can silently delete a guard

**Purpose**: a lint rule going quiet proves the flagged *pattern* is gone — never that the
behaviour that pattern was protecting is still intact.
**Mechanic**: after any refactor made to satisfy a linter or type-checker, diff it
specifically for **removed conditions**, not just for the rule disappearing — a guard
deleted and a guard satisfied look identical in a green lint run.

**The incident (2026-09-05)**: clearing two `react-hooks/set-state-in-effect` errors from
`app/domain/update/[name]/page.tsx` meant replacing the effect that seeded the resource
editor from existing on-chain links with a derived value. The refactor was right about the
lint rule, and dropped the `linksLoading` guard the old effect had. Because
`DomainLinksStorage.updateLinks` is a bulk replace, that opened a data-loss window: a user
typing before the read resolved would flip the "seeded" flag, never see the links that
arrived afterwards, and wipe them from the contract on save. Lint was green throughout,
and the type-checker had nothing to say either.

**The rule**: when one sweep touches many files (that one covered ~11), audit the rest for
the same class of loss instead of trusting the clean result. Note that the failure runs in
both directions — several fixes in that same sweep wrapped the identical synchronous
`setState` inside an `async function` so the rule simply stopped matching, without changing
the cascading-render behaviour the rule exists to prevent (see `GAPS.md`'s lint entry). A
zero-error lint run can mean *fixed*, *silenced*, or *quietly broken*, and only reading the
diff tells you which.

**Related instance (2026-09-06): suppressing a symptom is not fixing a cause.**
`DomainCard` wrapped an `<a>` inside a card-wide `next/link` -- a nested anchor, which is
invalid HTML that browsers resolve inconsistently and screen readers announce as one
confused control. Someone had added `onClick={(e) => e.stopPropagation()}`, which made the
*click* behave correctly and left the invalid markup exactly where it was. Same shape as the
lint case: the visible signal went quiet, so it looked fixed. When a workaround makes a
symptom disappear, ask what it did to the cause -- usually nothing.

## 14. A check that cannot see must report "unknown", never "OK"

**Purpose**: a monitor's job is to distinguish *working* from *broken*; a monitor that
cannot tell either from *couldn't look* is worse than none, because it converts an outage
into a green tick.
**Mechanic**: for every check, enumerate the outcomes as **three**, not two — pass, fail,
and could-not-determine — and make the third its own reported state. Only positive evidence
counts as a pass: a successful query proves a table exists; the absence of one specific
error does not.

**The incident (2026-09-06)**: `/api/status` reported "All 6 tables present" while every
table was missing. The check counted a table as missing only on the specific `PGRST205`
code, so *any other* error — a failed TLS handshake, in this case — fell through to
"present". The RLS probe had the identical flaw in the opposite direction: it read any error
at all as "the write was refused", so it would have reported RLS healthy while unable to
reach the database. Both were written the same afternoon, by the same reasoning: "if it's
not the failure I named, it must be fine."

**Checklist**: [`mind/health-check-checklist.md`](./mind/health-check-checklist.md).

**The rule**: never write `if (error.code === X) fail; else pass`. Write
`if (!error) pass; else if (error.code === X) fail; else unknown`. And when two independent
checks disagree — `db:check` said every table was missing, `/status` said all six were
present — do not pick the more convenient one. The disagreement *is* the finding, and here
it was the only reason the bug was caught at all.

**Recurrence (2026-09-06, same day, while writing the checklist for this principle)**: the
new `db:check` probe that proves the publishable key cannot call the `security definer`
write functions printed four green lines against a database that had no functions at all.
PostgREST hides functions the calling role cannot execute, so a correctly-revoked function
and a never-created one are the *same* response (`PGRST202`) — and the check read that as
"blocked". This is the sharpest form of the principle: the check was security-critical, it
was written by someone who had just articulated the rule, and it still went green because
"the call failed" felt like evidence. Fixed by gating it on an independent admin-side
existence probe. **If a check can pass because something is missing, it is not a check.**

## 15. A migration is finished when the old paths are gone, not when the new store works

**Purpose**: "we moved to X" describes an intention; what runs is whatever each individual
call site still points at, and those do not move because a decision was made.
**Mechanic**: after a store migration, go **page by page** and ask "which source actually
answers this one?" — not "does the new store work?". Grep for the old client, the old
address type, the old key. A path that still reads the old store compiles, renders, and
looks completely normal.

**The incident (2026-09-06)**: Supabase had been the primary store for a day, and three
paths had never moved. "My Votes" still read a contract with no deployed code, keyed by the
**Kasplex EVM** address while votes are stored against the **Kaspa L1** address — two
independent reasons to return nothing — and then displayed "You haven't voted for any
domains yet". "My Domains" answered "is this listed here?" with KNS's *marketplace* `listed`
flag, which means something else entirely. Neither produced an error, a warning, or a
failing build.

**The rule**: when a migration changes the **identity key** as well as the store — here,
EVM address to L1 address — every query keyed by the old identity silently returns empty
rather than failing. Empty is not an error, so nothing surfaces. Audit by identity, not just
by table name. This is principle #2 wearing a different hat: the pages weren't fabricating
data, they were reporting a confident *absence* they had not established.

## 16. Put the irreversible step last

**Purpose**: every check that runs after money moves is a check the user pays for when it
fails; ordering is a safety property, not an implementation detail.
**Mechanic**: list every way a request can be refused, then ask which of them run *after*
the irreversible step. Move all of them before it. Where that is impossible, say so
explicitly in the user-facing copy rather than implying a guarantee that isn't there.

**The incident (2026-09-06)**: the browser asked the wallet for 200 KAS and *then* posted
the request — at which point the server could still refuse for ownership, duplicate
listing, invalid category, or, worst of all, because it had no write key at all. The client
decided to use that flow from the **public** Supabase key; the server needed a
**different**, server-only one. A deployment with the first and not the second took real,
irreversible KAS and answered 503. Every one of those checks was cheap and could have run
first.

**Checklist**:
[`mind/irreversible-action-checklist.md`](./mind/irreversible-action-checklist.md).

**The rule**: the wallet prompt is the last uncertain step, never the first. A free,
authenticated preflight that runs every check and hands back a short-lived quote costs one
extra signature; the alternative costs the user the fee. And note what the preflight is
*not*: it is not a security boundary, and it must not become one — every check is re-run at
write time, so it can be deleted without making anything forgeable. A convenience mechanism
that quietly becomes load-bearing is principle #12's problem waiting to happen.

## 17. A value that crosses a boundary needs one owner of its format

**Purpose**: when a producer and a consumer agree informally on how a value is shaped, the
agreement is invisible to the compiler and the mismatch is invisible at runtime -- a value in
the wrong form does not throw, it just quietly means something else.
**Mechanic**: for any value two sides must agree on -- an identifier's canonical form, a
number's unit, a timestamp's epoch -- put the format in **one place** and make both sides go
through it. Where that is impossible, put the format **in the type**
(`{ amount: bigint; unit: 'sompi' | 'wei' }`) so a mismatch is a compile error rather than a
rendering. A comment saying "this is in sompi" is not an owner.

**The incidents (both 2026-09-06, both silent, both shipped)**:

- **Header search never worked.** It stripped `.kas` before looking a domain up, while
  `normalizeDomain` on the server *always appends* `.kas` before storing. So the lookup
  compared `"foo"` against a stored `"foo.kas"`, matched nothing, and sent the user to the
  search page instead of the domain whose exact name they had just typed. Broken on both
  read paths, from the first day, with no error anywhere. An equality match on the wrong
  form does not fail -- it returns "not found", which is a perfectly plausible answer.
- **Every domain card showed the fee off by ten orders of magnitude.** `Domain.feePaid` is
  **sompi** when Supabase produced the record and **wei** when a contract did -- one field,
  two units, differing by 10^10. The card printed it raw, so a 200 KAS listing rendered as
  "20000000000 KAS". And the obvious fix reintroduced it mirrored: formatting everything as
  sompi would have been just as wrong on the other path.

**The rule**: ask "who owns this format, and does everyone go through them?" Normalisation
belongs **inside** the lookup, not at each call site -- `lookupDomain` normalises now, so a
caller cannot get it wrong. A unit belongs in the type, not in a comment. And when you find
one of these, look for its mirror image: an implicit agreement is usually implicit in both
directions.

**Checklist**:
[`mind/shared-value-format-checklist.md`](./mind/shared-value-format-checklist.md).

## 18. Enumerate from the source of record, not from what the code happens to touch

**Purpose**: an audit's completeness is decided entirely by where its list came from, and
following usage produces a list missing precisely the things nothing uses yet -- which is
where dead and stale entries live.
**Mechanic**: before auditing anything, **write down where the list is coming from**, and
prefer the *declaration* over the *usage*: the config file, the schema, `git ls-files`, the
route manifest. Then check every entry, including the boring ones.

**The incident (2026-09-06)**: "4 of 6 contracts have no deployed code" appeared in five
documents for two days. Re-querying **all eight** addresses declared in `contracts.ts` with
raw `eth_getCode` gave **6 of 8** -- `EcosystemFund` and `DemoKNS` were dead too and had
never been checked. The original sweep enumerated from what the listing and voting flow
calls, so it missed exactly the two entries no live code path touches. One of them backs a
475-line admin page that consequently told its own administrator "Access Denied".

The same pass produced the other half of the lesson: the dead files were only found by
enumerating `git ls-files` and checking importers. Following imports outward from the routes
-- the natural way to explore a codebase -- can *never* find a file that nothing imports.

**Correction, next day**: that count was **18**. The real number is **27**, and finding it
needed two things the first pass got wrong even though it *had* started from `git ls-files`.
Enumerating from the declaration was necessary and not sufficient:

- **Match specifiers, not names.** `grep -rl walletClient` matches a local variable called
  `walletClient`; `grep -rl useVerifiedDomains` matches the line that *defines* it. Both
  read as "this file is used". Eight files were called live on that evidence.
- **Reachability is transitive.** A file imported only by a dead file is dead. Ten of the
  twenty-seven are reachable solely through two barrel files that nothing imports, so a
  single "does anything import me?" pass calls all ten live.

So the rule has a second half: having got the list right, make sure the *test you apply to
each entry* is the real question. And when a count is going to be written into a document,
make it a script — `npm run dead:check` now prints it, because a number I recomputed by hand
was wrong twice in two days.

**The rule**: usage-based enumeration is a reachability analysis, not an inventory. It
answers "what does the running code touch?", which is a different question from "what is
declared?" -- and the gap between those answers is where dead code, stale config and
unverified claims accumulate. When a count matters enough to write into a document, count
from the declaration.

**Checklist**: [`mind/verification-checklist.md`](./mind/verification-checklist.md), step 0.

## 19. When a principle keeps being violated, it has to become a mechanism

**Purpose**: writing a rule down is a request to remember it. Past some number of
recurrences, the evidence says remembering does not work, and continuing to rely on it is a
choice.
**Mechanic**: **count the recurrences.** The first is a mistake. The second is a pattern.
By the third, stop writing prose and make the build enforce it -- a lint rule, a type, a
constraint, a check that exits non-zero. If it cannot be enforced, say so explicitly and put
the check in a runnable checklist instead.

**The incident (2026-09-06)**: principle #2 -- don't fabricate data, an empty state and an
error state are different answers -- has been in this file since the beginning. It was then
violated **eight times**: the vote count, the voter list, the resources editor (where it let
a save delete every link an owner had), the categories index, the browse page, the profile
lookup, the admin owner check, and the listing page's category picker. All eight were
written or reviewed by someone who had read the principle. Several were written *in the same
session* as a fix for another instance of it.

So it became `eslint.config.mjs`: `return []` or `return {}` from a `catch` is an error in
`src/data` and `src/lib`. Scoped rather than global, because pages legitimately degrade --
`generateStaticParams` returning `[]` is correct. Verified in both directions, since a rule
that never fires proves nothing (#14): a probe file trips it, and the real tree is clean.

**The rule**: a recurring bug class is a **missing constraint**, not a missing reminder. The
same reasoning produced `npm run dead:check` after a hand-counted number was wrong twice, and
`domainName.ts` after five copies of one normalisation disagreed. When you catch yourself
writing "remember to..." for the third time, you are describing a lint rule, a type, or a
script -- write that instead.

## 20. A dead fallback is not free -- it is where bugs hide

**Purpose**: an alternative path that never runs is not a safety net. It is untested code
that doubles the shape of everything it touches, and the doubling is what causes bugs in the
path that *does* run.
**Mechanic**: for any fallback, ask **when it last succeeded**. If the answer is "never" or
"nobody knows", delete it. Keeping it needs a positive reason -- a scenario in which it
demonstrably works -- not merely the absence of a reason to remove it.

**The incident (2026-09-06)**: the Kasplex contract path sat behind every read and write as
"the fallback, in case the contracts come back". **Six of its eight configured addresses had
no deployed code**, and the two that did failed every call with `invalid opcode: MCOPY`. It
could not answer a single query and had not been able to for the life of the project.

It was not inert. Because every path carried two branches, and one was never exercised:

- **`Domain.feePaid` meant sompi on one branch and wei on the other**, so every card showed
  the fee off by 10^10 (#17).
- **Votes were keyed by the L1 address on one branch and the EVM address on the other**, so
  "My Votes" was permanently empty and the "already voted?" check compared the wrong address.
- **A vote counter read the dead contract** and rendered "Unavailable" on every domain,
  directly above a working count from the database.
- **The admin page told its own administrator "Access Denied"**, because an owner that could
  not be *loaded* was indistinguishable from one that did not *match*.
- **Two wallets had to be connected**, so users who connected the one that mattered were told
  they were not connected.

Every one of those is a bug in the *live* path, caused by the shape the dead path forced on
it. Removing the fallback deleted 34 files and around a fifth of `src/`, and none of the
remaining code had to grow a branch to compensate.

**The rule**: "we'll keep it in case we need it later" is a bet that the cost of carrying it
is zero. It is not: it is every `if (a) { ... } else { ... }` that the live path now has to
be written around, and every reviewer-hour spent reading a branch that cannot execute. If it
does not work now, and nobody can say when it last did, it is not a fallback -- it is a
liability with a reassuring name.

## 21. A one-time token is not a version check

**Purpose**: prevent a valid, single-use request from replacing data the editor never saw.
**Mechanic**: load the rendered data and a monotonic revision together; carry that revision
through token issuance and the final write; then lock, compare, mutate and increment it in
one database transaction.

**The incident (2026-09-06)**: signing a digest of the profile body fixed substitution -- a
captured `update-links` signature could no longer be paired with somebody else's links -- but
it deliberately still accepted the exact old body for five minutes. The resources route is a
bulk replacement: delete every link, then insert the supplied set. So a perfectly valid old
request could restore the old profile after a newer save. The newer category editor has the
same shape and would have inherited the same bug.

The tempting repair was a server-issued nonce. That stops the *same request* from running
twice, but it does not solve a stale tab on its own: if the server looks up the current
revision when the user clicks Save, that stale tab receives a fresh token for a profile it
never rendered and can still overwrite it. The revision has to be the one coupled to the
initial read, not one minted at save time.

The implemented contract is therefore four-part: the profile read returns its revision with
the data; the owner signs a request for a short-lived token bound to domain, action, signer
and that revision; the final signed body carries both token and revision; and the Postgres
function locks the domain row, rejects a mismatch, consumes the matching unexpired token,
replaces the data and increments the revision. A failed mutation rolls token consumption back
with the transaction. `KD006` (used/expired token) and `KD007` (stale profile) stay separate
because the recovery is different: sign again versus reload first.

**The rule**: replay prevention and optimistic concurrency solve different questions. Ask
both: “can this capability be used twice?” and “was this change based on the state it is
about to replace?” A yes to the first does not imply a yes to the second. See
[`mind/optimistic-concurrency-checklist.md`](./mind/optimistic-concurrency-checklist.md)
before adding any bulk replace, especially where a second browser tab can edit the same row.

## Related docs

- [`mind/`](./mind/) — working checklists that turn the principles above into concrete
  steps to run (verification, fallback-auditing, shared-function changes, testnet-reset
  context), for when you're about to do the thing a principle is about, not just remember
  why it matters.
- [`mind/shared-value-format-checklist.md`](./mind/shared-value-format-checklist.md) —
  the runnable version of principle #17.
- [`FILES.md`](./FILES.md) — the map: every file, its status, and the prioritised TODO.
  Keeping it current is a standing rule, not an optional courtesy — see above.
- [`kaspadomains-systems.md`](./kaspadomains-systems.md) — the same codebase cut by
  *system* rather than by folder: what each one does and which files build it.
- [`SPEC.md`](./SPEC.md) — the verified ground truth principle #1 depends on.
- [`BUGS.md`](./BUGS.md) — the incidents behind these principles, in full, including how
  each was actually fixed where it has been.
- [`GAPS.md`](./GAPS.md) — decisions flagged rather than guessed at (principle #8).
- [`HISTORY.md`](./HISTORY.md) — the dated narrative these principles were extracted from.
