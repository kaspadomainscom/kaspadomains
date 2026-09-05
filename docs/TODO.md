# TODO / Backlog

Last updated: 2026-09-05

This file is now a **live scratchpad and index**, not the full record. The detailed,
organized content that used to live here has moved into focused files — this file just
points to them and holds the actively-updated loop backlog below.

- [`BUGS.md`](./BUGS.md) — what's broken (open + a fixed-bugs changelog)
- [`GAPS.md`](./GAPS.md) — what's missing or incomplete (features, dead code, infra)
- [`LIFECYCLE.md`](./LIFECYCLE.md) — how a domain/fee/vote flows through the system
- [`SPEC.md`](./SPEC.md) — verified contract addresses and function signatures
- [`MIND.md`](./MIND.md) — operating principles for working on this codebase
- [`PROJECT_PLAN.md`](./PROJECT_PLAN.md) — current state and roadmap
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — technical architecture narrative
- [`BUSINESS_PLAN.md`](./BUSINESS_PLAN.md) — product/business framing
- [`KASPA_DEVELOPMENT.md`](./KASPA_DEVELOPMENT.md) — current Kaspa/Kasplex/Igra ecosystem
  state, confirmed root cause of the MCOPY bug, and a phased plan for the Web3 layer
- [`mind/`](./mind/) — working checklists derived from `MIND.md`'s 12 principles
  (verification, fallback-auditing, shared-function changes, testnet-reset context)
- [`HISTORY.md`](./HISTORY.md) — dated narrative log of what was built/found/decided each
  session, broader than `BUGS.md`'s bug-only changelog
- [`../README.md`](../README.md) — repo root entry point; now describes the actual
  project and links back into this folder (was still generic `create-next-app`
  boilerplate until this pass)
- [`../AGENTS.md`](../AGENTS.md) — **Codex and Claude both work on this repo.** Work
  split, ground rules, and the live board they use to hand off and flag things to each
  other. Read/update it before starting non-trivial work.

When recording new work: a broken thing goes in `BUGS.md`, a missing thing goes in
`GAPS.md`, a new operating lesson goes in `MIND.md`. Use this file for short-lived,
in-progress notes only.

## Continuous audit loop — backlog for next iterations

A recurring local loop (`/loop 8m`, job `2e58e210`) is running audit-and-fix passes across
UI/UX, content, SEO, and missing-page gaps, recording completed work in `BUGS.md`/`GAPS.md`
as it goes. Checked so far: homepage + trending data, `/domains`, `/domains/top-voted`,
`/search`, `DomainCard`, OG/Twitter metadata, robots.txt, marketplace-language across the
whole site, mobile hamburger menu, image alt text, heading hierarchy (all pages now have
exactly one `<h1>`), internal linking + theme + breadcrumbs on `/learn`, `/docs`,
`/business-plan`, both category pages, a full (non-`tail`-truncated) lint audit, the entire
community voting feature (was calling nonexistent contract functions everywhere), and the
listing-price display/admin-adjustability questions. Also fixed this pass: `README.md` was
still unedited `create-next-app` boilerplate (no project description, no link into this
folder) — rewritten; and found `src/types/db.ts` is dead code (never imported) containing
a marketplace-shaped `Domain` type and an old commented-out CSP draft that's the likely
origin of the still-open "why does `connect-src` allowlist Supabase" question in `GAPS.md`.
Not yet checked, in rough priority order — full detail on each in [`GAPS.md`](./GAPS.md)
and [`BUGS.md`](./BUGS.md):

- [x] ~~`DomainLinksStorage.getLinks` throws `invalid opcode: MCOPY`~~ — investigated
      2026-09-05 by querying the live RPC directly. Turned out much bigger than the one
      function: **4 of 6 contracts in `contracts.ts` have no deployed code at all**
      (Registry, VotesManager, CategoriesStorage, KDCToken — real fund-safety risk, see
      `BUGS.md`), and the 2 that do exist (`DomainLinksStorage`, `DomainDataStorage`) fail
      `invalid opcode: MCOPY` on **every** function touching a dynamic type, not just
      `getLinks`. Full writeup in [`BUGS.md`](./BUGS.md)'s two new CRITICAL entries. This
      is now the top-priority item for whoever owns contract deployment — needs correct
      current addresses and/or a redeploy with an older EVM target, neither of which is
      something to guess at or do autonomously.
- [x] Live-traced whether the dead-contract bug could cause real fund loss through the
      app's own UI (2026-09-05): it can't, right now — `useListDomain.ts`,
      `useSetDomainCategories.ts`, and `VotingSection.tsx` all read a live value from the
      broken contracts *before* constructing any payable transaction, and that read throws
      cleanly, so none of the three flows can currently reach a value-carrying write. This
      is fragile/accidental, not by design — see `BUGS.md`. Replaced the raw RPC error
      text those three flows would otherwise show with an honest "temporarily unavailable"
      message.
- [x] Found and **fixed** a second, deeper instance of the fabricated-data anti-pattern
      while tracing the above: `loadCategoriesManifest()` (called from 11 files across the
      app) swallowed contract failures and returned a hardcoded fake domain instead of an
      honest error — which was also why `app/domain/[name]/page.tsx`'s already-written
      "Contract Unavailable" error state never fired, showing a misleading generic 404
      instead. All 11 call sites checked and given an honest degraded state; a fully dead
      duplicate implementation deleted; verified with a real `npm run build` (exit 0) and
      a clean generated `sitemap.xml`. Full writeup in `BUGS.md`'s Fixed section and
      [`mind/fallback-audit-checklist.md`](./mind/fallback-audit-checklist.md).
- [x] Found and fixed the identical `notFound()`-vs-real-failure conflation in a second
      file, `app/domains/categories/category/[category]/page.tsx`'s page body (the first
      was `domain/[name]/page.tsx`'s metadata function) — now shows an honest "Contract
      Unavailable" message for a real load failure instead of a misleading 404, while
      preserving the file's existing "no JSX inside try/catch" lint-fix structure.
      Verified with `tsc`, `eslint` on the file, and a full build.
- [x] Deleted 773 lines of confirmed-dead code (`src/hooks/likes/`, all of
      `src/hooks/solidity/` — turned out to be the whole directory, not just the 2 files
      `GAPS.md` had flagged — `src/data/categories/*.ts` (16 files), and `src/types/db.ts`)
      after re-verifying each with precise import-statement greps and checking for barrel
      exports. Verified with a real `npm run build` (exit 0), not just the grep.
- [x] Lint debt cleared (0 problems / 110 files) and the three decide-or-delete items
      resolved — `new-listings` → redirect, `DomainForm` → deprecated stub,
      `CustomizeDomainForm` → deleted. Audited that sweep's refactors for dropped guards
      rather than trusting the green run: found one real data-loss regression (fixed) and
      several cosmetic rule-silencing fixes (documented, not "fixed" — see `GAPS.md`).
      Produced `MIND.md` principle #13.
- [x] `/search` no longer reports a contract outage as "No matching domains found", and
      no longer lets a superseded query overwrite current results.
- [x] **User data migrated off-chain to Supabase** (owner decision, 2026-09-05). Reads and
      writes both go to Postgres now, behind signed requests, with the contract path kept
      as an automatic fallback. See `ARCHITECTURE.md`, `SPEC.md`'s API table, and
      `GAPS.md` for the four gaps this opened.
- [ ] **Decide what replaces the listing/vote fees.** Both are free now — the contracts
      that charged them are gone. Revenue question, needs an owner call.
- [ ] **Update site copy to match reality**: `/docs`, the homepage ("one-time payment for
      lifetime exposure", "210 KAS") and `/business-plan` all still promise a permanent
      on-chain listing that is paid for. None of that is true today.
- [ ] **Exercise the Supabase work against a real project.** Schema, RLS policies and all
      three endpoints are verified by type-check/lint/build only — no query or insert has
      ever run.
- [ ] Missing Terms/Privacy/About pages — flagged, not drafted without real input.
- [ ] Internal linking + breadcrumbs on domain profile pages (`/domain/[name]`) — has a
      Home/Domains breadcrumb; worth checking whether it should also link to the domain's
      category.
- [ ] Mobile check remaining pages: `/domain/update/[name]`, `EcosystemAdmin`,
      `/domains/my-domains`.
- [ ] Competitor/search-intent research for Kaspa/KNS domain discovery sites — not started.
- [ ] Re-grep periodically for marketplace-adjacent language using entity-aware patterns.
- [ ] Core Web Vitals — `next.config.ts` sets `images.unoptimized: true`; worth a decision.
- [ ] Spot-check remaining contract-call sites against `SPEC.md` (the voting bug means
      nothing gets a pass just because it's not "likes"-named).

## Process note

Recent commit history (`git log`) has no descriptive messages ("Your commit message",
"sdsd", etc.) prior to this session. Continue writing real commit messages so `git log`/
`git blame` stay useful — memory and docs can't substitute for that.
