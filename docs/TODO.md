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
- [`../README.md`](../README.md) — repo root entry point; now describes the actual
  project and links back into this folder (was still generic `create-next-app`
  boilerplate until this pass)

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

- [ ] `DomainLinksStorage.getLinks` throws `invalid opcode: MCOPY` in the browser console —
      needs investigation, could mean the resources feature has the same "never actually
      works" problem voting had.
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
