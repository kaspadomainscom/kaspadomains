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

## The one the linter cannot see: an empty accumulator

The lint rule for `MIND.md` #2 matches `return []` inside a `catch`. The same bug has a
second syntax it cannot match, because the empty value is declared before the `try` and the
catch has nothing to return:

```ts
let trending: Domain[] = [];            // <- the empty value lives here
try { trending = await load(); }
catch (e) { console.error(e); }         // <- nothing to flag
```

This is not hypothetical: it is what the homepage did until 2026-09-07, rendering
*"No domains listed yet — be the first"* to every visitor while the database was
unreachable. A rule matching "a catch that only logs" was trialled and rejected — three hits,
all false positives, including the *corrected* version of that same homepage.

- [ ] Run it by hand. There are only ever a handful of hits:

  ```bash
  grep -rnE "^\s*let [A-Za-z_]+(: [^=]+)? = (\[\]|\{\})" src --include=*.ts --include=*.tsx
  ```

- [ ] For each hit, one of these must be true, and you must be able to point at it:
  - a **companion failure flag** set in the catch (`let loadError = false` — see
    [`app/domains/top-voted/page.tsx`](../../src/app/domains/top-voted/page.tsx)), and the
    render checks that flag **before** it checks for emptiness; or
  - the variable is `T | null`, initialised to `null`, so "not known" is representable
    (see [`app/page.tsx`](../../src/app/page.tsx)); or
  - a comment saying **why degrading silently is correct here**. The sitemap qualifies: a
    sitemap is a hint rather than an exhaustive list, so publishing fewer URLs claims
    nothing false. "The UI still renders" is not a reason — that was the exact comment
    sitting above the homepage bug.

- [ ] Same question for `useState<T[]>([])` where the state is filled by a fetch, and for a
  component prop typed `T[]` whose parent may pass `[]` after a failed read. The parent is
  the one that has to distinguish, and the child cannot tell.

## Worked example from this codebase

See [`BUGS.md`](../BUGS.md)'s entry on `loadCategoriesManifest()` for the full trace:
source location, all 11 callers, the specific fake data returned, and the dead-code
consequence in the domain-profile page. Not fixed yet — flagged as the next priority
once the underlying contract-address question is resolved, since the fix needs each of
those 11 call sites checked individually.
