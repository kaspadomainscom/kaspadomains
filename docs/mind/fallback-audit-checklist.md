# Fallback-audit checklist

**Purpose**: find fabricated-data fallbacks hiding in shared/central code, not just the
display components built on top of it.

Last updated: 2026-09-05

[`MIND.md`](../MIND.md) principle #2 says never fabricate data — show an honest
empty/error state instead. That principle was first applied to a single display
component (the homepage's hardcoded "Trending .kas Domains" array). On 2026-09-05 the
identical pattern turned up again, one layer deeper: the shared data-loading function
[`loadCategoriesManifest()`](../../src/data/categoriesManifest.ts) — called from **11
other files** across the app — catches any on-chain failure and returns a hardcoded fake
domain (`"example.kaspa"`) instead of surfacing the error. Fixing the one component
that hit this before didn't eradicate the pattern, because the real problem lived
upstream, in shared code nobody thought to re-check. This checklist is how to find the
rest of it before it surfaces the same way again.

## How to search

- [ ] Grep for `catch` blocks in files that make on-chain reads (`readContract`,
  `getContract(...).read.*`, ethers `Contract` calls), not just in UI components — this
  bug was in `src/data/`, not `src/components/`.
- [ ] Inside each, check what the function returns on failure. Red flags:
  - A literal hardcoded object/array shaped like real data (a fake domain, a fake price,
    a fake count) — the caller has no way to tell it apart from the truth.
  - A default like `0`, `[]`, `false`, or `'#'` for a field that has real on-chain meaning
    — silently indistinguishable from "the real value is zero/empty."
  - Anything named `fallback*`, `default*`, `mock*`, `demo*`, `example*` returned from a
    `catch` rather than used explicitly and visibly as a labeled placeholder.
- [ ] For each shared/central function found this way, list every caller (`grep -rl
  functionName src/`) before deciding how to fix it — a change to one shared function's
  failure behavior can ripple into every page that calls it, so the full call-site list
  needs checking before flipping "swallow-and-fake" to "surface-and-handle."

## What "surface it correctly" looks like

- [ ] The function should either re-throw (letting each caller decide how to show the
  failure) or return a typed result that distinguishes "empty because there's genuinely
  nothing here" from "empty because the read failed" — never collapse both into the same
  shape.
- [ ] Before changing a central function's failure behavior, check whether any caller
  *already* has honest error-handling code waiting for this — as
  [`app/domain/[name]/page.tsx`](../../src/app/domain/[name]/page.tsx) did here (a
  well-written "Contract Unavailable" state that was simply never reached, because the
  error never arrived). Fixing the source can turn dead code into working code for free.
- [ ] Double-check `catch` blocks that conflate two different failure reasons into one
  message — e.g. a block that catches both "the underlying data genuinely wasn't found"
  and "the network call failed" will mislabel one of them no matter which fallback text
  it shows. (Found alongside this bug: `generateMetadata`'s catch in the same file
  conflates Next.js's internal `notFound()` throw with a real contract failure.)

## Worked example from this codebase

See [`BUGS.md`](../BUGS.md)'s entry on `loadCategoriesManifest()` for the full trace:
source location, all 11 callers, the specific fake data returned, and the dead-code
consequence in the domain-profile page. Not fixed yet — flagged as the next priority
once the underlying contract-address question is resolved, since the fix needs each of
those 11 call sites checked individually.
