# Shared-function change checklist

**Purpose**: stop a fix to one widely-called function from silently breaking, or
silently failing to help, callers nobody looked at.

Last updated: 2026-09-05

[`MIND.md`](../MIND.md) principle #12 says a shared function's fix isn't done until every
caller is checked. Grew directly out of fixing the `loadCategoriesManifest()` fabrication
bug (principle #2's recurrence): the fake-data removal itself was a one-line change, but
the function had 11 real callers with 11 different existing error-handling shapes, and
one of them (a build-time route) would have failed the production build if left unchecked.

## Before changing what a shared function does on failure (or any contract change)

- [ ] Find every caller: `grep -rl functionName src/` (or your project's equivalent).
  Don't estimate from memory — list them.
- [ ] For each caller, read the surrounding code and classify it:
  - Already has its own `try`/`catch` with an honest degraded state → safe, no change
    needed there.
  - Has a `.catch()` that only logs → check what happens to the state that never gets
    set — usually safe (stays in a loading/empty state) but worth a glance.
  - Has **no** error handling at all → this is the dangerous case. Decide what an honest
    failure should look like *for that specific caller* (an empty list, a cached/last-
    known value, a visible "unavailable" message) and add it.
- [ ] Flag any caller that runs at build time (a static route, `generateStaticParams`,
  `generateMetadata`) with extra care — an unhandled rejection there can fail the whole
  build, not just degrade one page at runtime. Verify with a real `npm run build`, not
  just `tsc --noEmit` or the dev server — a type-check proves the shapes still line up,
  not that the build succeeds end to end.
- [ ] After the change, re-run the search from step 1 to confirm the count didn't change
  (no caller added or missed) and skim each one once more with the new behavior in mind.

## After the change

- [ ] Verify the failure path actually gets exercised, not just the success path — the
  whole point of this class of bug is that the failure path silently never ran before.
  If the underlying dependency (a contract, an API) is genuinely down right now, that's
  a free opportunity to watch the new handling fire for real rather than simulate it.
- [ ] Check whether any caller had its *own* honest error-handling code that was
  previously unreachable because the shared function never actually threw (this is
  exactly what happened to `app/domain/[name]/page.tsx`'s "Contract Unavailable" UI) —
  fixing the source can turn dead code into working code for free, which is worth calling
  out explicitly rather than just noting as a side effect.

## Related docs

- [`../MIND.md`](../MIND.md#12-fixing-a-shared-function-isnt-done-until-every-caller-is-checked)
  — the principle this checklist operationalizes.
- [`fallback-audit-checklist.md`](./fallback-audit-checklist.md) — the companion
  checklist for finding *where* a function fabricates data in the first place; this one
  is for safely changing it once found.
- [`../BUGS.md`](../BUGS.md) — the `loadCategoriesManifest()` fix, worked from exactly
  this checklist.
