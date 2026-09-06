# Files

Last updated: 2026-09-06

Every file in the repo, what it is for, and whether it is actually doing
anything. **Current inventory:** 93 files under `src/`, with `npm run dead:check` reporting
89 source files, 39 entry points, and **zero unreachable files** on 2026-09-06. This map
exists because nobody could previously answer which files were live without manually tracing
many dead EVM fallback paths.

Use this as the map. [`TODO.md`](./TODO.md) is the live backlog,
[`BUGS.md`](./BUGS.md) is what's broken, [`GAPS.md`](./GAPS.md) is what's
missing.

## Status legend

| | Meaning |
|---|---|
| ✅ | Live and working, verified this session |
| 🟡 | Live, but with a known limitation — see the note |
| ⛔ | **Dead** — no importer, or depends on a contract with no deployed code |
| 🔒 | Blocked on the schema being applied to the live Supabase project |

---

## 1. Where the project actually stands

**Current implementation:**

- All nine findings from Codex's security audit now have code-level fixes — body-bound
  signatures, payer-attributed receipts, a global single-use receipt ledger, a free
  preflight before payment, atomic writes, CSP limits, a server-side category allow-list,
  profile-write replay/concurrency protection, and patched `ws`.
- The Supabase migration finished: three read paths had never left the
  contracts.
- Four new pages (`/status`, `/about`, `/terms`, `/privacy`), the paid-write preflight, and
  owner-only category/profile-token endpoints make failed deployment setup honest rather than
  pretending that an absent contract fallback works.
- Twenty-three user-facing bugs, including structured data that published
  `foo.kas.kas` to every search engine, a resources editor that would delete an
  owner's links after a failed read, a pay button quoting the wrong price, an
  admin page that denied access to the administrator, header search that never
  found anything, two places that rendered a confident zero when they had simply
  failed to load, every domain card showing the fee off by ten orders of
  magnitude, and a connect button that said "Connect Kasware" to users who were
  already connected.
- `docs/FILES.md` and `docs/kaspadomains-systems.md` — the file map and the
  system map. Keeping both current is now a standing rule in `MIND.md`.

**The one thing blocking everything:** `supabase/schema.sql` has never been
applied. `npm run db:check` and `/status` agree, independently, that every table
is missing. Until it runs, **no listing, vote or edit has ever been exercised end
to end**, and no RLS policy has been proven in practice. Everything marked 🔒
below is waiting on that single step.

---

## 2. Root

| File | Purpose | Status |
|---|---|---|
| `README.md` | Setup, database bootstrap, the TLS-interception pitfall | ✅ |
| `AGENTS.md` | Coordination board with Codex — work split, ground rules, message log | ✅ |
| `package.json` | Deps + `dev`/`build`/`start`/`lint`/`test`/`db:check`/`dead:check` | ✅ |
| `next.config.ts` | `serverExternalPackages: ['kaspa-wasm']` — keeps the verifier out of the browser bundle | ✅ |
| `.env.example` | Every variable, with why each one matters | ✅ |
| `.github/workflows/ci.yml` | Runs lint, native tests and build on push/PR | ✅ |
| `.claude/launch.json` | Dev-server config for the preview tooling | ✅ |
| `eslint.config.mjs` | Next presets **plus a project rule**: no `return []`/`{}` from a `catch` in `src/data` or `src/lib` | ✅ |
| `tsconfig.json`, `postcss.config.mjs`, `tailwind.config.ts`, `components.json`, `.gitattributes`, `.gitignore`, `.vscode/`, `schemas/` | Standard tooling config | ✅ |

---

## 3. Database — `supabase/`

| File | Purpose | Status |
|---|---|---|
| `schema.sql` | **Run this first.** Full bootstrap: 7 tables, 1 view, RLS, 4 atomic write functions, profile revisions/tokens, 16 seeded categories | 🔒 never applied |
| `migrations/README.md` | Why migrations exist despite `schema.sql` being idempotent — `create table if not exists` skips new *columns* | ✅ |
| `migrations/0001_baseline.sql` | Pointer to `schema.sql`; deliberately not a copy that could drift | ✅ |
| `migrations/0002_payment_receipts.sql` | The global receipt ledger + ownership/payment columns | 🔒 |
| `migrations/0003_atomic_writes.sql` | `create_listing`, `record_vote`, `replace_domain_categories`, `replace_domain_links`, `kaspadomains_schema_version` | 🔒 |
| `migrations/20260906201516_profile_replay_protection.sql` | `profile_revision`, private one-time write tokens, revised replacement RPC signatures and schema version 4 | 🔒 |

> ⚠ `0003`'s functions are `security definer` and **bypass RLS by design**. Postgres
> grants `EXECUTE` to `PUBLIC` by default and PostgREST exposes every
> `public`-schema function as an RPC, so the revoke block at the bottom of that
> file is load-bearing. `npm run db:check` proves the publishable key cannot call
> them — treat a failure there as a live vulnerability, not a config nit.

---

## 4. Server-side security — `src/lib/server/`

The authorisation model lives here. Read [`ARCHITECTURE.md`](./ARCHITECTURE.md#data-model) first.

| File | Purpose | Status |
|---|---|---|
| `verifyRequest.ts` | Verifies a Kaspa L1 signature with `kaspa-wasm`, derives the address, reads the KNS owner server-side, requires a match. `normalizeDomain` here decides the canonical stored name | ✅ |
| `verifyPayment.ts` | Confirms a fee transaction on-chain **and that the signer paid it** — without that, a public txid is a bearer coupon | ✅ |
| `paymentIntent.ts` | Short-lived HMAC proving the preflight ran. Explicitly **not** a security boundary — every check is re-run at write time | ✅ |
| `rpcError.ts` | Maps the SQL functions' custom `KD001`–`KD007` codes to honest HTTP answers | ✅ |

Deleted: `claimReceipt.ts` — with the write atomic there is nothing to release.

---

## 5. API routes — `src/app/api/`

| Route | Method | Purpose | Status |
|---|---|---|---|
| `domains/preflight` | POST | Free, signed. Every check that can fail, **before** the wallet is asked to pay | 🔒 |
| `domains` | POST | Create a listing. 200 KAS, owner-only, requires an intent | 🔒 |
| `domains/[name]/vote` | POST | One vote per wallet. 1 KAS, requires an intent | 🔒 |
| `domains/[name]/links` | PUT | Bulk-replace profile links. Owner-only, free, rejects non-`http(s)` URLs | 🔒 |
| `domains/[name]/categories` | GET / PUT | Bulk-replace categories. Owner-only, free, allow-list enforced | 🔒 |
| `domains/[name]/write-nonce` | POST | Owner-only, signed issuance of a short-lived token bound to the loaded profile revision | 🔒 |
| `status` | GET | Deployment health. 503 when failing, `unknown` when it cannot see | ✅ |
| `csp-violation-report` | POST | Hardened: 8 KB cap, ten-field allow-list, control chars stripped | ✅ |

---

## 6. Data layer — `src/data/`, `src/lib/`

| File | Purpose | Status |
|---|---|---|
| `data/supabaseSource.ts` | Every Supabase read. `fetchAllPages` avoids silent truncation; profile-link reads include the rendered revision | ✅ |
| `data/domainLookup.ts` | `lookupDomain` returns three outcomes — found / not-listed / **unavailable** — so an outage never 404s a live domain | ✅ |
| `data/categoriesManifest.ts` | Supabase category manifest. Filters `is_allowed`, which is why the profile page must not use it for existence | 🟡 |
| `data/types.ts` | The canonical directory `Domain` shape | ✅ |
| `lib/supabase.ts` | Typed read/admin clients. Admin throws if constructed in the browser | ✅ |
| `lib/database.types.ts` | Hand-written schema/RPC types + `REQUIRED_SCHEMA_VERSION` 4 | ✅ |
| `lib/fees.ts` | **The single source of the fee.** 200 KAS / 1 KAS, treasury address, shape-validated | ✅ |
| `lib/domainName.ts` | **The one owner of a `.kas` name's canonical form.** Dependency-free, so server and client share it | ✅ |
| `lib/profileWrite.ts` | The closed profile-write action set, nonce TTL and safe revision parser shared by browser/API/read layer | ✅ |
| `lib/signedMessage.ts` | Canonical JSON → SHA-256 → signed message. Dependency-free so it never pulls WASM into the browser | ✅ |
| `lib/signedFetch.ts` | `preflight` → `payFee` → `signedFetch`, plus signed profile-token preparation | ✅ |
| `lib/topVotedDomains.ts` | Ranking. Reads counts from the same store as the listings, never a mix | 🟡 |
| `lib/jsonld.ts` | Structured data | ✅ |
| `lib/kaspaDomainRuntime.ts` | Current KNS network, endpoint and non-authoritative covenant target | ✅ |
| `proxy.ts` | CSP with per-request nonce, HSTS, COOP/CORP | ✅ |

---

## 7. Pages — `src/app/`

| Page | Purpose | Status |
|---|---|---|
| `page.tsx` | Homepage | ✅ |
| `domains/page.tsx` | Browse + filter. Windowed pagination; an outage is not rendered as an empty directory | 🔒 |
| `domains/categories/` | Category index and per-category pages | 🔒 |
| `domains/top-voted/` | Ranking | 🔒 |
| `domains/my-domains/` | KNS ownership **and** listing status, kept as separate questions | 🔒 |
| `domains/my-votes/` | Rewritten to read Supabase by the L1 address | 🔒 |
| `domains/new-listings/` | Redirect to `/list-domain` | ✅ |
| `domain/[name]/` | Public profile. Existence from `domains`, category only a label | 🔒 |
| `domain/update/[name]/` | Owner-only editor: links + categories | 🔒 |
| `list-domain/` | Listing flow entry | 🔒 |
| `search/` | Client-side filter over all listings | 🟡 loads every listing into the browser |
| `status/` | Live health, human-readable. `noindex` | ✅ |
| `about/`, `terms/`, `privacy/` | Written from the source, not a template | 🟡 not legally reviewed |
| `docs/`, `learn/`, `business-plan/` | Explanatory content | ✅ |
| `sitemap.xml/`, `robots.txt/`, `layout.tsx`, `loading.tsx`, `not-found.tsx`, `providers/` | Infrastructure | ✅ |

---

## 8. Components and hooks

**Live components:** `Header` (+`trendingDomains`), `Footer`, `Sidebar`,
`DomainCard`, `PickDomainModal`, `Loader`, `ToastProvider`,
`JsonLd`, `NonceWrapper`, `KaspaDomainsLogo`, `icons`, and under `pages/domain/`:
`VotingSection`, `CategoryEditor`, `DomainInfoPanel`, `DomainTitleSection`,
`DomainBreadcrumb`, `DomainResources`, `Detail`.

**Live hooks:** `useListDomain`, `useUpdateDomainLinks`, `useDomainCategories`,
`useGetDomainLinks`, `useGetAllowedCategories`, `useMyVotes`, `useListingStatuses`,
`useTrendingDomains`, `useOwnedDomains`, `usePaginatedDomains`, and the Kasware wallet
hook.

### Reachability

`npm run dead:check` is the source of record: as of 2026-09-06 it reports 89 source files,
39 entry points, 89 reachable files and **0 unreachable files**. The stale EVM adapters and
six unimported KNS hooks were removed rather than allowlisted.

## 8b. Documentation — `docs/`

The map had no entry for its own folder until 2026-09-06. 22 files.

| File | Purpose |
|---|---|
| `FILES.md` | This file. **Keeping it current is a standing rule** — see `MIND.md` |
| `kaspadomains-systems.md` | The same codebase cut by *system*: what each does and which files build it |
| `CODEX-TODO.md` | The work queue and path ownership between the two agents. Ground rule 0 in `AGENTS.md` |
| `BUGS.md` | Open bugs + a fixed changelog carrying the evidence for each claim |
| `GAPS.md` | What's missing, and the decision blocking each |
| `SPEC.md` | Endpoints, pages, verified contract signatures, the paid-write order |
| `ARCHITECTURE.md` | Stack, data model, authorisation model |
| `LIFECYCLE.md` | How a `.kas` name moves from KNS to a listing with votes |
| `HISTORY.md` | Dated narrative — the *order* things were discovered in |
| `PROJECT_PLAN.md`, `BUSINESS_PLAN.md` | Product and business framing |
| `TODO.md` | Live backlog and doc index |
| `MIND.md` | 21 operating principles, each from a real incident |
| `PROPOSED-STRUCTURE.md` | A feature-sliced layout for `src/`, with lint enforcement and a phased migration. **Proposal — needs a decision** |
| `mind/README.md` + 8 checklists | The runnable version of those principles |
| `Toccata-Dev.md` | Kaspa covenants — the intended end state |
| `KASPA_DEVELOPMENT.md` | Ecosystem research |
| `SECURITY_AUDIT_2026-09-05.md` | Codex's audit. All nine findings have code-level fixes; deployment still awaits schema application |

---

## 9. TODO — in priority order

### Blocking

1. **Apply `supabase/schema.sql`.** Everything marked 🔒 depends on this one
   step. Then `npm run db:check` — it should go green.
2. **Exercise the paid flow once, end to end**, with a real Kasware wallet:
   preflight → pay → list. No listing has ever been created.

### Decisions only the owner can make

3. **Refund policy.** `/terms` currently says not to assume one exists — honest,
   but not a policy. The preflight makes paid-but-unfulfilled unlikely, not
   impossible.
4. **Operating entity and jurisdiction** for `/terms` and `/privacy`, plus legal
   review. Both carry an explicit "not reviewed by a lawyer" notice.

### Engineering

5. **Server-side search.** `/search` loads every listing into the browser to
   filter client-side.
6. **Dependency majors**: eslint 10, TypeScript 7, `@noble/curves` 2,
    `lucide-react` 1, `@types/node` 26. In-range updates are already applied.
7. **Real OG image.** `public/og-image.png` is the square logo renamed, so every
    social share is cropped.
8. Mobile pass on `/status`, `/about`, `/terms`, `/privacy`,
    `/domain/update/[name]`, `/domains/my-domains`.

### Long-term

13. **L1 covenants as the source of truth** — listings become covenant UTXOs,
    Postgres demoted to a rebuildable index. Resolve KNS-transfer handling first.
    See [`Toccata-Dev.md`](./Toccata-Dev.md).

---

## Related docs

- [`TODO.md`](./TODO.md) — live backlog
- [`BUGS.md`](./BUGS.md) — what's broken, and the fixed changelog with evidence
- [`GAPS.md`](./GAPS.md) — what's missing or half-built
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — how the pieces fit
- [`SPEC.md`](./SPEC.md) — endpoints, pages, contract signatures
- [`LIFECYCLE.md`](./LIFECYCLE.md) — how a domain moves through the system
- [`kaspadomains-systems.md`](./kaspadomains-systems.md) — the same code by system
- [`MIND.md`](./MIND.md) — the operating principles these bugs produced
