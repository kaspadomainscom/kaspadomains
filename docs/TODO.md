# TODO / Backlog

Last updated: 2026-09-07

This file is now a **live scratchpad and index**, not the full record. The detailed,
organized content that used to live here has moved into focused files — this file just
points to them and holds the actively-updated loop backlog below.

- [`CODEX-TODO.md`](./CODEX-TODO.md) — **the work queue and path ownership between Claude
  and Codex.** Read before starting anything
- [`FILES.md`](./FILES.md) — every file, what it does, whether it's live, and the
  prioritised TODO
- [`kaspadomains-systems.md`](./kaspadomains-systems.md) — the same codebase by *system*,
  each with the files it's built from
- [`PROPOSED-STRUCTURE.md`](./PROPOSED-STRUCTURE.md) — proposed feature-sliced layout and
  the lint rules that would enforce it (needs a decision)
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
- [`Toccata-Dev.md`](./Toccata-Dev.md) — Kaspa L1 covenants (Toccata): reference, links,
  and the analysis of whether our data can eventually move off the database onto L1
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

A recurring local loop (`/loop 10m`, job `9a9a1656`) is running audit-and-fix passes across
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

### Repeatable loop contract

Each 10-minute run uses an isolated worktree and completes at most one independently
testable item. It reads `AGENTS.md`, `CODEX-TODO.md`, `MIND.md`, `TODO.md`, `BUGS.md` and
`GAPS.md`, checks for in-flight work, stops for owner-only decisions or live Supabase/chain/
treasury actions, runs the relevant gates (`npm test`, `npm run lint`, `npm run build`,
`npx tsc --noEmit`, `npm run dead:check`, plus `npm run db:check` for database changes), and
commits only after they pass. At the end of a successful iteration, push only that verified
commit to the current branch's configured remote; never force-push, rewrite history, or push
unrelated in-flight files. Reports use the fixed `STATUS / ITEM / RESULT / COMMIT / FILES /
CHECKS / BLOCKER / NEXT` shape and notify only on a change, verification failure, push failure
or blocker.

**Automation blocker (2026-09-07):** the Codex app lookup reports that job `9a9a1656` no
longer exists, so the push-at-end policy could not be written to the scheduled job. This pass
did not create a duplicate or guess its preserved fields; the owner must recreate or relink the
10-minute loop before continuous runs can resume.

### First-cycle activation, truth and branding items

- [x] **TRUTH-001** (2026-09-07): active 200 KAS listing and 1 KAS vote labels now derive
      from `src/lib/fees.ts`; contradictory “free today” copy is removed while signing and
      post-listing profile edits remain explicitly free. The unapplied schema remains an
      honest availability blocker.
- [ ] **BRAND-001**: integrate the supplied logo into tracked `public/brand/` assets, root
      metadata and a real 1200×630 social image.
- [ ] **ACT-001**: make homepage/header routes to explore, search, profiles and listing
      explicit while preserving preflight-before-payment.
- [ ] **ACT-002**: verify profile-to-listing continuity across stale, unavailable and mobile
      states.
- [ ] **POLISH-001**: process remaining mobile, accessibility, performance and SEO checks
      after activation and truth items pass.

- [x] ~~`DomainLinksStorage.getLinks` throws `invalid opcode: MCOPY`~~ — investigated
      2026-09-05 by querying the live RPC directly. Turned out much bigger than the one
      function: **6 of the 8 contracts in `contracts.ts` have no deployed code at all**
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
- [x] **Owner-only writes enforced** (2026-09-05): listing and editing require a Kaspa L1 signature from the address KNS reports as owner, verified server-side with kaspa-wasm and re-checked per request. Closes the ownership gap; see `GAPS.md`.
- [x] **Fees restored** (2026-09-05): 200 KAS to list, 1 KAS to vote, paid on Kaspa L1 to
      the treasury and verified server-side — payer identity included, and each receipt
      single-use across every action. Free to edit links or categories afterwards.
- [x] **Security audit answered** (2026-09-06): seven of Codex's nine findings fixed
      (SA-01/02/03/04/06/07/09). SA-05 (nonce + profile revision) and SA-08 (transactional
      write) remain — see `GAPS.md`.
- [x] **SA-08: paid writes are atomic** (2026-09-06). Four `security definer` Postgres
      functions, one transaction each. I made the SQL call rather than waiting on it, since
      the schema had not been applied yet and adding the functions now costs nothing;
      say if you'd rather it were done differently. Only mechanical rules moved into SQL —
      authorisation stayed in the routes.
- [ ] **Dependency majors, deliberately not taken** (2026-09-06). In-range updates applied
      (React 19.2.8, viem 2.56.3, Tailwind 4.3.3, ethers 6.17, TypeScript 5.9.3), 0
      vulnerabilities. Left alone because each is a breaking jump needing its own pass:
      **eslint 10**, **TypeScript 7**, **lucide-react 1**, **@types/node 26**. (**@noble/curves 2**
      was on this list; the package is unused and is queued for removal in
      [`CODEX-TODO.md`](./CODEX-TODO.md) item 1, so it needs deleting rather than upgrading.
      `viem` is already gone.)
- [x] **SA-05: one-time nonce and a profile revision** — closed by Codex in `548e764`.
      `/api/domains/[name]/write-nonce` issues the nonce, `lib/profileWrite.ts` owns the
      revision, and the SQL functions raise `KD006`/`KD007` for a spent nonce and a stale
      revision. See `MIND.md` #21 for why both were needed rather than either alone.
- [ ] **L1 covenants as the source of truth** (decided in principle 2026-09-05, not
      started). Listings move to a Toccata covenant family; Postgres stays as a rebuildable
      index rather than the truth; votes stay off-chain until Based Apps ship. Resolve the
      KNS-transfer question first — a covenant pinned to the original owner keeps trusting
      them after a sale. See [`Toccata-Dev.md`](./Toccata-Dev.md) and `PROJECT_PLAN.md`
      Phase 2.5.
- [x] **Site copy updated to match reality** (2026-09-07): the homepage, `/list-domain`,
      `/docs`, `/learn` and `/business-plan` now agree with the active 200 KAS listing and
      1 KAS vote schedule. They distinguish free signing and post-listing profile edits, and
      `/docs` still explains that the index is database-backed rather than an on-chain record.
- [ ] **Exercise the Supabase work against a real project.** ⚠ **This is the blocker.**
      The connection, the keys and the treasury address are all live and verified, but
      `supabase/schema.sql` has never been applied — `npm run db:check` and `/status` agree
      independently that every table is missing. Until it runs, no listing, vote or edit
      has ever been exercised end to end, and no RLS policy has been proven in practice.
- [x] **Terms / Privacy / About pages** (2026-09-06): built at `/terms`, `/privacy` and
      `/about`, written from the schema and routes rather than a template. Still marked
      "not reviewed by a lawyer", and silent on **refunds**, the **operating entity** and
      the **governing jurisdiction** — three owner decisions that are still open.
- [ ] **Decide the refund policy.** Now the sharpest remaining product question: the
      preflight makes a paid-but-unfulfilled action unlikely rather than impossible, and
      `/terms` currently tells users not to assume a refund exists. That is honest but not
      a policy.
- [ ] Internal linking + breadcrumbs on domain profile pages (`/domain/[name]`) — has a
      Home/Domains breadcrumb; worth checking whether it should also link to the domain's
      category.
- [ ] Mobile check remaining pages: `/domain/update/[name]`, `/domains/my-domains`, and
      the four newer ones (`/status`, `/about`, `/terms`, `/privacy`). (`EcosystemAdmin`
      was on this list and no longer exists — deleted with the EVM removal on 2026-09-06.)
- [ ] Competitor/search-intent research for Kaspa/KNS domain discovery sites — not started.
- [ ] Re-grep periodically for marketplace-adjacent language using entity-aware patterns.
- [ ] Core Web Vitals — `next.config.ts` sets `images.unoptimized: true`; worth a decision.
- [x] ~~Spot-check remaining contract-call sites against `SPEC.md`~~ — moot since
      2026-09-06: there are no contract-call sites left. `contracts.ts`, `src/abis/**`,
      `viemClient.ts` and the Kasplex hooks were all removed, and `viem` is no longer a
      dependency. `SPEC.md` is kept as the record of what those addresses were.

## Process note

Recent commit history (`git log`) has no descriptive messages ("Your commit message",
"sdsd", etc.) prior to this session. Continue writing real commit messages so `git log`/
`git blame` stay useful — memory and docs can't substitute for that.
