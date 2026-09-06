# Files

Last updated: 2026-09-06

Every file in the repo, what it is for, and whether it is actually doing
anything. **Rewritten 2026-09-06** after the EVM contract path was removed: `src/` went
from 129 source files to 95, and unreachable files from 27 to 8. Written because "which of these 128 source files are live?" turned out
to be a question nobody could answer quickly — and the answer includes **27 dead
files**, most of them wired to contracts that have no deployed code.

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

**Fixed and verified this session** (13 commits, `4f2b4c3`…`64c7c6d`):

- All nine findings from Codex's security audit closed except SA-05 — body-bound
  signatures, payer-attributed receipts, a global single-use receipt ledger, a
  free preflight before any payment, atomic writes, CSP limits, a server-side
  category allow-list, and patched `ws`.
- The Supabase migration finished: three read paths had never left the
  contracts.
- Four new pages (`/status`, `/about`, `/terms`, `/privacy`) and two new
  endpoints (`/api/domains/preflight`, `/api/domains/[name]/categories`).
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
| `package.json` | Deps + `dev`/`build`/`start`/`lint`/`db:check`/`dead:check`. **No `test`** | 🟡 |
| `next.config.ts` | `serverExternalPackages: ['kaspa-wasm']` — keeps the verifier out of the browser bundle | ✅ |
| `.env.example` | Every variable, with why each one matters | ✅ |
| `.github/workflows/ci.yml` | Runs `lint` + `build` on push/PR. No tests, because there are none | 🟡 |
| `.claude/launch.json` | Dev-server config for the preview tooling | ✅ |
| `eslint.config.mjs` | Next presets **plus a project rule**: no `return []`/`{}` from a `catch` in `src/data` or `src/lib` | ✅ |
| `tsconfig.json`, `postcss.config.mjs`, `tailwind.config.ts`, `components.json`, `.gitattributes`, `.gitignore`, `.vscode/`, `schemas/` | Standard tooling config | ✅ |

---

## 3. Database — `supabase/`

| File | Purpose | Status |
|---|---|---|
| `schema.sql` | **Run this first.** Full bootstrap: 6 tables, 1 view, RLS, 4 atomic write functions, 16 seeded categories | 🔒 never applied |
| `migrations/README.md` | Why migrations exist despite `schema.sql` being idempotent — `create table if not exists` skips new *columns* | ✅ |
| `migrations/0001_baseline.sql` | Pointer to `schema.sql`; deliberately not a copy that could drift | ✅ |
| `migrations/0002_payment_receipts.sql` | The global receipt ledger + ownership/payment columns | 🔒 |
| `migrations/0003_atomic_writes.sql` | `create_listing`, `record_vote`, `replace_domain_categories`, `replace_domain_links`, `kaspadomains_schema_version` | 🔒 |

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
| `rpcError.ts` | Maps the SQL functions' custom `KD001`–`KD005` codes to HTTP answers | ✅ |

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
| `status` | GET | Deployment health. 503 when failing, `unknown` when it cannot see | ✅ |
| `csp-violation-report` | POST | Hardened: 8 KB cap, ten-field allow-list, control chars stripped | ✅ |

---

## 6. Data layer — `src/data/`, `src/lib/`

| File | Purpose | Status |
|---|---|---|
| `data/supabaseSource.ts` | Every Supabase read. `fetchAllPages` exists because PostgREST truncates unbounded selects **without an error** | ✅ |
| `data/domainLookup.ts` | `lookupDomain` returns three outcomes — found / not-listed / **unavailable** — so an outage never 404s a live domain | ✅ |
| `data/categoriesManifest.ts` | Category manifest, Supabase or chain. Filters `is_allowed`, which is why the profile page must not use it for existence | 🟡 |
| `data/types.ts` | The `Domain` shape both sources return | ✅ |
| `lib/supabase.ts` | Typed read/admin clients. Admin throws if constructed in the browser | ✅ |
| `lib/database.types.ts` | Hand-written schema types + `REQUIRED_SCHEMA_VERSION` | ✅ |
| `lib/fees.ts` | **The single source of the fee.** 200 KAS / 1 KAS, treasury address, shape-validated | ✅ |
| `lib/domainName.ts` | **The one owner of a `.kas` name's canonical form.** Dependency-free, so server and client share it | ✅ |
| `lib/signedMessage.ts` | Canonical JSON → SHA-256 → signed message. Dependency-free so it never pulls WASM into the browser | ✅ |
| `lib/signedFetch.ts` | `preflight` → `payFee` → `signedFetch`. The order is the safety property | ✅ |
| `lib/topVotedDomains.ts` | Ranking. Reads counts from the same store as the listings, never a mix | 🟡 |
| `lib/jsonld.ts`, `lib/utils.ts`, `lib/domains.ts` | Structured data and helpers | ✅ |
| `lib/contracts.ts` | Contract addresses + ABIs. **6 of the 8 have no deployed code** (re-verified 2026-09-06) | ⛔ |
| `lib/viemChains.ts`, `viemClient.ts`, `kasplex.ts`, `kasplexProvider.ts`, `kaswareEvm.ts`, `walletClient.ts` | Kasplex EVM access — fallback path only | 🟡 |
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
| `EcosystemAdmin/` | Administers a fund contract with **no deployed code** | ⛔ |
| `sitemap.xml/`, `robots.txt/`, `layout.tsx`, `loading.tsx`, `not-found.tsx`, `providers/` | Infrastructure | ✅ |

---

## 8. Components and hooks

**Live components:** `Header` (+`trendingDomains`), `Footer`, `Sidebar`,
`ConnectButton`, `DomainCard`, `PickDomainModal`, `Loader`, `ToastProvider`,
`JsonLd`, `NonceWrapper`, `KaspaDomainsLogo`, `icons`, and under `pages/domain/`:
`VotingSection`, `CategoryEditor`, `DomainInfoPanel`, `DomainTitleSection`,
`DomainBreadcrumb`, `DomainResources`, `Detail`.

**Live hooks:** `useListDomain`, `useUpdateDomainLinks`, `useDomainCategories`,
`useGetDomainLinks`, `useGetAllowedCategories`, `useMyVotes`,
`useListingStatuses`, `useTrendingDomains`, `useSetDomainCategories`,
`useDomainByHash`, `useGetDomainLikeCount`, `usePaginatedDomains`,
`useOwnedDomains`, `useVerifiedDomains`, `useKasware`, and the two wallet
internals.

### ⛔ Dead files — 27, unreachable from every route

Run `npm run dead:check` — the list below is its output, not a hand count.

**This number was wrong twice before it was measured.** It was reported as 18, from a
bare-name grep, which is wrong in both directions: `grep -rl walletClient` matches a *local
variable* called `walletClient`, and `grep -rl useVerifiedDomains` matches the line that
*defines* it. Both read as "used". Getting it right needs two things the naive version
misses — resolve module **specifiers** rather than names, and treat reachability as
**transitive**, because ten of these are reachable only through two barrel files that
nothing imports.

```
src/test/a.tsx                                        (EMPTY FILE)
src/components/ConnectButton.tsx                      (Header defines its own, locally)
src/components/DomainForm.tsx
src/components/NonceWrapper.tsx
src/components/pages/EcosystemAdmin/DistributionHistoryTable.tsx
src/components/pages/domain/DomainOwnerBio.tsx
src/hooks/domain/index.ts                             (barrel, unused)
src/hooks/domains/index.ts                            (barrel, unused)
src/hooks/domain/useDomainOwnerAndTimestamp.ts        ┐
src/hooks/domain/useDomainStringFromHash.ts           │
src/hooks/domain/useGetDomainData.ts                  │ reachable only
src/hooks/domain/useIsDomainListed.ts                 │ through a dead
src/hooks/domains/useGetDomainCategories.ts           │ barrel
src/hooks/domains/useGetDomainsByCategory.ts          │
src/hooks/domains/useGetDomainsByCategoryPaginated.ts │
src/hooks/domains/useListedDomainsPaginated.ts        │
src/hooks/domains/useTotalListedDomains.ts            ┘
src/hooks/kns/useKasware.ts                           (only the dead ConnectButton)
src/hooks/kns/api/useAssetStatus.ts
src/hooks/kns/api/useCheckDomainAvailability.ts
src/hooks/kns/api/useDomainOwner.ts
src/hooks/kns/api/useDomainSearch.ts
src/hooks/kns/api/useVerifiedDomains.ts
src/hooks/kns/api/useVerifyOwnership.ts
src/lib/domains.ts
src/lib/kasplexProvider.ts
src/lib/walletClient.ts
```

That is **27 of 127 source files — roughly a fifth of `src/` is unreachable.** Most read
contracts with no deployed code, so wiring one up would fail rather than work; they are a
trap, not a resource.

**Not deleted**: that is the owner's call, and some of the KNS hooks
(`useCheckDomainAvailability`, `useDomainSearch`) are plausibly wanted later. `src/test/a.tsx`
is an empty file and could go today.

## 8b. Documentation — `docs/`

The map had no entry for its own folder until 2026-09-06. 22 files.

| File | Purpose |
|---|---|
| `FILES.md` | This file. **Keeping it current is a standing rule** — see `MIND.md` |
| `kaspadomains-systems.md` | The same codebase cut by *system*: what each does and which files build it |
| `BUGS.md` | Open bugs + a fixed changelog carrying the evidence for each claim |
| `GAPS.md` | What's missing, and the decision blocking each |
| `SPEC.md` | Endpoints, pages, verified contract signatures, the paid-write order |
| `ARCHITECTURE.md` | Stack, data model, authorisation model |
| `LIFECYCLE.md` | How a `.kas` name moves from KNS to a listing with votes |
| `HISTORY.md` | Dated narrative — the *order* things were discovered in |
| `PROJECT_PLAN.md`, `BUSINESS_PLAN.md` | Product and business framing |
| `TODO.md` | Live backlog and doc index |
| `MIND.md` | 18 operating principles, each from a real incident |
| `PROPOSED-STRUCTURE.md` | A feature-sliced layout for `src/`, with lint enforcement and a phased migration. **Proposal — needs a decision** |
| `mind/README.md` + 7 checklists | The runnable version of those principles |
| `Toccata-Dev.md` | Kaspa covenants — the intended end state |
| `KASPA_DEVELOPMENT.md` | Ecosystem research |
| `SECURITY_AUDIT_2026-09-05.md` | Codex's audit. 8 of 9 findings closed; SA-05 open |

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
5. **Delete `/EcosystemAdmin` and the 27 dead files?** They administer and query
   contracts that do not exist.
6. **A test runner** (`node:test` vs `vitest`, and whether CI runs it). See the
   argument in `GAPS.md` — the 2026-09-06 paging bug passed `tsc`, `eslint` and
   `build` while returning 100 of 10,000 rows.

### Engineering

7. **SA-05** — one-time nonce + profile revision. The last open audit finding;
   unclaimed on the board.
8. **Silent wallet reconnect.** Auto-reconnect calls `eth_requestAccounts`, which
   **prompts on every page load** with a remembered wallet. Should use
   `eth_accounts` and only escalate on explicit user action. Codex's area.
9. **Server-side search.** `/search` loads every listing into the browser to
   filter client-side.
10. **Dependency majors**: eslint 10, TypeScript 7, `@noble/curves` 2,
    `lucide-react` 1, `@types/node` 26. In-range updates are already applied.
11. **Real OG image.** `public/og-image.png` is the square logo renamed, so every
    social share is cropped.
12. Mobile pass on `/status`, `/about`, `/terms`, `/privacy`,
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
