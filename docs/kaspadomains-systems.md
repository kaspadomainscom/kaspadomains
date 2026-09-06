# KaspaDomains — systems

Last updated: 2026-09-07

The same codebase cut by **system** rather than by folder. Each entry says what the system
does, how it works, every file it is built from, and where it is weak.

[`FILES.md`](./FILES.md) answers "what is this file?". This answers "what builds this
behaviour, and what else will I break if I change it?" — the question that actually matters
before touching something.

Status uses the same markers: ✅ working · 🟡 works with a known limitation · ⛔ dead ·
🔒 blocked on the schema being applied.

---

## Index

| # | System | Status | One line |
|---|---|---|---|
| 1 | [Identity & authorization](#1-identity--authorization) | ✅ | Prove you own the domain, on every single write |
| 2 | [Payments](#2-payments) | 🔒 | Take a fee without ever taking it for nothing |
| 3 | [Listings](#3-listings) | 🔒 | Create and read the listing itself |
| 4 | [Categories](#4-categories) | 🔒 | The only navigation the site has |
| 5 | [Voting](#5-voting) | 🔒 | One paid vote per wallet per domain |
| 6 | [Profiles & resources](#6-profiles--resources) | 🔒 | The links an owner attaches |
| 7 | [Discovery](#7-discovery) | 🟡 | Browse, search, trending, ranking |
| 8 | [Storage](#8-storage) | 🔒 | Postgres and its schema — the only store |
| 9 | [Health & operations](#9-health--operations) | ✅ | Whether any of this is actually working |
| 10 | [Delivery & security headers](#10-delivery--security-headers) | ✅ | CSP, nonces, transport hardening |
| 11 | [SEO & structured data](#11-seo--structured-data) | ✅ | What crawlers and social cards see |
| 12 | [UI shell](#12-ui-shell) | ✅ | Layout, header, footer, toasts |
| 13 | [Legacy Kasplex/EVM](#13-legacy-kasplexevm) | ✅ | **Removed 2026-09-06** — kept here as a record of what went and why |
| 14 | [Docs & coordination](#14-docs--coordination) | ✅ | How the project remembers things |

---

## 1. Identity & authorization

**What it does.** Establishes that a request came from the wallet that owns a domain on
KNS. This is the whole security model — the contract used to be what stopped someone
listing a domain they don't own, and this is what replaced it.

**How.** The browser asks Kasware to sign a message with the **Kaspa L1 key** (the key that
owns the name; the Kasplex EVM key is a different keypair and proves nothing about
ownership). The server verifies the signature with `kaspa-wasm`, derives the `kaspa:`
address from the signing public key, reads the authoritative owner from KNS **server-side**,
and requires the two to match. The signed message includes a SHA-256 of the canonical
request body, so a signature authorises *this exact request*, not any request of that shape.

Ownership is re-read from KNS on every request rather than stored, so a domain that changes
hands immediately follows its new owner.

| File | Role |
|---|---|
| `src/lib/signedMessage.ts` | Message format, canonical JSON, body digest. Dependency-free so WASM never reaches the browser |
| `src/lib/domainName.ts` | The one owner of a `.kas` name's canonical form — server and client both use it, so they cannot drift |
| `src/lib/profileWrite.ts` | Closed action set, token lifetime and exact profile-revision parsing |
| `src/lib/signedFetch.ts` | Client side: get the key, sign, send; obtains the one-time profile token before a bulk replace |
| `src/lib/server/verifyRequest.ts` | Verify signature → derive address → read KNS owner → require match. `normalizeDomain` here defines the canonical stored name |
| `src/context/WalletContext.tsx` | The Kaspa L1 wallet identity used for ownership proofs |
| `src/hooks/wallet/internal/useKaswareWallet.ts` | Kaspa L1 connection |
| `next.config.ts` | `serverExternalPackages: ['kaspa-wasm']` — load-bearing |

**Weak points.** Profile bulk writes now carry a one-time token and the revision rendered by
the editor, but that code remains unavailable until the schema migration is applied. Kasware's
signing convention is assumed to match the SDK's and has never been exercised against a real
extension; a mismatch rejects legitimate owners rather than admitting impostors.

---

## 2. Payments

**What it does.** Charges 200 KAS to list and 1 KAS to vote, on Kaspa L1, without ever
taking money for something it then refuses to do.

**How.** Four ordered steps, and the order *is* the design:

1. **Preflight** — signed, free, no side effects. Checks write-readiness, schema version,
   KNS ownership, whether the target exists or is already listed/voted, and the category
   allow-list. Returns a 10-minute HMAC **payment intent** bound to action + domain + signer
   + amount, and the price.
2. **Pay** — the wallet sends the amount *the server quoted*, not a client constant.
3. **Verify** — the transaction is fetched from `api.kaspa.org`, must be accepted, must pay
   the treasury enough, and must have an **input belonging to the signer**. Without that
   last check a public txid is a bearer coupon anyone can spend.
4. **Consume** — the receipt is claimed in one global ledger inside the same transaction as
   the write, so it can fund exactly one action of any kind, ever.

| File | Role |
|---|---|
| `src/lib/fees.ts` | **The single source of the amounts.** Treasury address + shape validation |
| `src/app/api/domains/preflight/route.ts` | Every check that can fail, before any money moves |
| `src/lib/server/paymentIntent.ts` | Issue/verify the HMAC intent. Explicitly *not* a security boundary |
| `src/lib/server/verifyPayment.ts` | On-chain verification, including who paid |
| `src/lib/server/rpcError.ts` | Maps `KD001`–`KD007` from the SQL functions to HTTP |
| `src/lib/signedFetch.ts` | `preflight()` and `payFee()` — the only place funds move |
| `supabase/migrations/0003_atomic_writes.sql` | Receipt claim + write in one transaction |
| `supabase/migrations/20260906201516_profile_replay_protection.sql` | Profile revision + one-time write-token transaction contract |
| `src/hooks/domain/useListDomain.ts`, `src/components/pages/domain/VotingSection.tsx` | The two callers |

**Weak points.** A payment can still be made and the write still fail if the connection
drops between steps 2 and 3 — the receipt stays unclaimed, so retrying with the same txid
works, but only if the user comes back. **The refund policy is an unmade decision**, and
`/terms` says not to assume one exists.

> Read [`mind/irreversible-action-checklist.md`](./mind/irreversible-action-checklist.md)
> before changing anything in this system.

---

## 3. Listings

**What it does.** Creates the listing row and reads it back. Replaces
`KaspaDomainsRegistry.listDomain`.

**How.** `POST /api/domains` verifies ownership, then the intent, then the payment, then
calls one Postgres function that consumes the receipt, inserts the listing and attaches its
categories — all-or-nothing. Reads go through an indexed single-row lookup that returns
three outcomes, so an outage never 404s a live domain.

| File | Role |
|---|---|
| `src/app/api/domains/route.ts` | Create |
| `supabase/migrations/0003_atomic_writes.sql` → `create_listing` | The transactional write |
| `src/data/domainLookup.ts` | `lookupDomain` (found / not-listed / **unavailable**), `normalizeDomainName` |
| `src/data/supabaseSource.ts` | `fetchDomainByName`, `fetchAllDomains`, `fetchListingStatuses` |
| `src/data/types.ts` | The `Domain` shape both sources return |
| `src/app/list-domain/page.tsx`, `src/components/PickDomainModal.tsx` | The listing UI |
| `src/hooks/domain/useListDomain.ts` | preflight → pay → sign → post |
| `src/hooks/kns/api/useOwnedDomains.ts`, `useVerifiedDomains.ts`, `usePaginatedDomains.ts` | What the wallet owns, from KNS |
| `src/app/domain/[name]/page.tsx` | The public profile |
| `src/app/domains/my-domains/page.tsx` | Owns (KNS) vs listed (us) — deliberately separate questions |

**Weak points.** A listing is a mutable database row, not an on-chain fact. There is no
delist or transfer flow.

---

## 4. Categories

**What it does.** Places a listing in up to six categories. Categories are the **only
navigation the site has**, so a listing with none is invisible — which is why an empty set
is refused.

**How.** Chosen at listing time and changeable afterwards for free. Every key is checked
against `is_allowed` **server-side** — the UI offering only valid options is not a security
boundary, and a foreign key proves a category *exists*, not that it is published.

| File | Role |
|---|---|
| `src/app/api/domains/[name]/categories/route.ts` | GET (public) / PUT (owner-only, free) |
| `src/app/api/domains/[name]/write-nonce/route.ts` | Owner-only token issuance for the revision rendered by either bulk editor |
| `supabase/migrations/20260906201516_profile_replay_protection.sql` → `replace_domain_categories` | Validate + swap, reject stale revision, consume one token, atomically |
| `src/hooks/domain/useDomainCategories.ts` | Read + save |
| `src/hooks/domains/useGetAllowedCategories.ts` | The allow-list, with **titles** not just keys |
| `src/components/pages/domain/CategoryEditor.tsx` | The editor |
| `src/data/categoriesManifest.ts` | Manifest for browse pages. Filters `is_allowed` |
| `src/app/domains/categories/page.tsx`, `.../category/[category]/page.tsx` | Browse |

**Weak points.** The manifest drops disallowed categories, so it must never be used to
decide whether a *domain* exists — doing that made withdrawing a category 404 paid listings.
Fixed, but the sharp edge is still there for anyone reaching for the manifest.

---

## 5. Voting

**What it does.** One paid vote per wallet per domain, driving the top-voted ranking.

**How.** Same preflight-then-pay order as listing. The unique constraint on
`(domain_id, voter)` is what actually enforces one-per-wallet — application code cannot
decide that atomically. Votes are keyed by the **Kaspa L1 address**, not the EVM one.

| File | Role |
|---|---|
| `src/app/api/domains/[name]/vote/route.ts` | Cast |
| `supabase/migrations/0003_atomic_writes.sql` → `record_vote` | Receipt + vote + count, atomically |
| `src/components/pages/domain/VotingSection.tsx` | The UI, counts and voter list |
| `src/hooks/domains/useMyVotes.tsx` | "My votes", keyed by the L1 address |
| `src/app/domains/my-votes/page.tsx` | That page |
| `src/data/supabaseSource.ts` | `fetchVoteCount`, `fetchHasVoted`, `fetchVoters`, `fetchVotedDomains`, `fetchVoteCounts` |
| `src/lib/topVotedDomains.ts` | Ranking |
| `src/app/domains/top-voted/page.tsx` | The ranking page |
| `src/components/contracts/DomainVotesManager/DomainLikeCount.tsx`, `src/hooks/domain/useGetDomainLikeCount.ts` | Inline count |

**Weak points.** Votes are off-chain and stay that way until Based Apps ship. Nothing
prevents one person voting from many wallets — the fee is the only friction.

---

## 6. Profiles & resources

**What it does.** The links an owner attaches to their domain's public page.

**How.** Bulk replace: the request carries the complete desired list, and anything omitted
is deleted. Owner-only, free, and every URL must be `http(s)` — a `javascript:` URL rendered
as an anchor on a public profile is stored XSS.

| File | Role |
|---|---|
| `src/app/api/domains/[name]/links/route.ts` | PUT, bulk replace, max 10 |
| `src/app/api/domains/[name]/write-nonce/route.ts` | POST, signed owner-only issuance of a token bound to the rendered revision |
| `supabase/migrations/20260906201516_profile_replay_protection.sql` → `replace_domain_links` | Lock + compare revision + consume token + replace + increment, in one transaction |
| `src/hooks/domain/useGetDomainLinks.ts`, `useUpdateDomainLinks.ts` | Read / write |
| `src/app/domain/update/[name]/page.tsx` | The editor |
| `src/components/pages/domain/DomainResources.tsx` | Public render. Says so when links can't be loaded rather than rendering nothing |
| `src/components/pages/domain/DomainInfoPanel.tsx`, `DomainTitleSection.tsx`, `DomainBreadcrumb.tsx`, `Detail.tsx` | The rest of the profile |

**Weak points.** Bulk replace means an editor that saves without knowing the current links
wipes them. The editor now locks on an unknown snapshot and carries the **loaded** revision
through a one-time token into the atomic write, so an old tab is rejected instead of rolling
the profile back. This remains blocked on the schema being applied; no live wallet/database
run has proven the flow. No bio, title or image is implemented yet.

---

## 7. Discovery

**What it does.** How anyone finds a domain: browse, categories, search, trending, ranking.

| File | Role |
|---|---|
| `src/app/domains/page.tsx` | Browse + filter, windowed pagination |
| `src/app/domains/categories/**` | Category index and pages |
| `src/app/domains/top-voted/page.tsx` | Ranking |
| `src/app/search/page.tsx` | Search results — four explicit states |
| `src/components/header/Header.tsx` | The search box; jumps straight to a domain when the name matches |
| `src/components/header/trendingDomains.tsx`, `src/hooks/domains/useTrendingDomains.ts` | The trending strip |
| `src/data/domainLookup.ts` | `getAllDomains`, `lookupDomain` |
| `src/data/supabaseSource.ts` | `fetchAllPages`, `fetchCategoryDomains` |
| `src/components/DomainCard.tsx` | The card. Formats the fee **by source unit** — sompi from Supabase, wei from the contracts |

**Weak points.** 🟡 **Search loads every listing into the browser** and filters client-side;
at the 10,000 cap that is a large payload and belongs server-side. Every "load everything"
read must page — PostgREST truncates unbounded selects **without an error**, which is how a
paid listing silently vanishes from search.

---

## 8. Storage

**What it does.** Holds listings, votes, categories, links and receipts. It is the only
store: without it the site cannot serve listings at all, which `/status` says plainly.

**How.** Postgres via Supabase. RLS is on for every table with public read and **no write
policy at all**: the publishable key ships to every browser, so if it could insert, anyone
could forge a listing and the owner-only API would be decorative. All writes go through the
server's secret key, after verification.

| File | Role |
|---|---|
| `supabase/schema.sql` | Full bootstrap — the one file to run on a new project |
| `supabase/migrations/0001…20260906201516` + `README.md` | Incremental upgrades for existing projects |
| `src/lib/supabase.ts` | Typed read/admin clients; admin throws if constructed in the browser |
| `src/lib/database.types.ts` | Hand-written schema types, `REQUIRED_SCHEMA_VERSION`, `TABLE_NAMES` |
| `src/data/supabaseSource.ts` | Every read |
| `src/data/categoriesManifest.ts`, `domainLookup.ts` | Source selection — callers never learn which answered |
| `scripts/db-check.mjs` | Connection, schema drift, RLS, function permissions |

> ⚠ The four write functions are `security definer` and **bypass RLS by design**. Postgres
> grants `EXECUTE` to `PUBLIC` by default and PostgREST exposes every `public`-schema
> function as an RPC, so the revoke blocks in `0003` and the profile-write migration are
> load-bearing. If you add a function
> there, add it to the revoke loop **and** to the `db:check` probe in the same change.

**Weak points.** 🔒 The schema has **never been applied** — this is the single blocker for
everything marked 🔒. Postgres is the source of truth rather than an index, which was forced
by the dead contracts, not chosen; see [`Toccata-Dev.md`](./Toccata-Dev.md).

---

## 9. Health & operations

**What it does.** Answers "is it me, or is it the site?" — for users and for whoever runs
it.

**Why it exists.** Every failure it reports has been silent at some point: the schema never
applied, a database password pasted where a secret key belonged, a treasury address left
blank. None of those crash anything; the app just degrades into a quieter version of itself
until someone loses money or gives up.

| File | Role |
|---|---|
| `src/app/api/status/route.ts` | Machine-readable; 503 when failing |
| `src/app/status/page.tsx` | The human-readable version |
| `scripts/db-check.mjs` | The CLI equivalent, exits non-zero so it can gate a deploy |
| `scripts/dead-code.mjs` | Reachability from every route. `npm run dead:check` |
| `.github/workflows/ci.yml` | Native tests, lint and build on every push |
| `src/app/api/csp-violation-report/route.ts` | Hardened report sink |

**The rule that governs this system:** a check that cannot see must report **unknown**,
never OK — see `MIND.md` #14 and
[`mind/health-check-checklist.md`](./mind/health-check-checklist.md). Two checks here have
already gone green precisely because they could observe nothing.

**Weak points.** 🟡 The native test suite is still small: CI runs its nine tests, lint and
build, but profile-write race behavior needs a database-backed test after the schema exists.
`dead:check` is green locally but is not yet a CI step.

---

## 10. Delivery & security headers

| File | Role |
|---|---|
| `src/proxy.ts` | CSP with a per-request nonce, HSTS, COOP/CORP, `Report-To` |
| `src/context/NonceProvider.tsx`, `src/components/NonceWrapper.tsx` | Nonce plumbing |
| `src/components/JsonLd.tsx` | Nonce-tagged structured data |
| `src/app/api/csp-violation-report/route.ts` | Violation reports: 8 KB cap, field allow-list |
| `src/lib/supabase.ts` → `getSupabaseOrigin()` | Adds only the configured project origin to `connect-src` |

**Weak points.** `connect-src` is derived from config, so a misconfigured Supabase URL
silently drops out of the allow-list rather than erroring.

---

## 11. SEO & structured data

| File | Role |
|---|---|
| `src/app/sitemap.xml/route.ts` | Static routes + categories + active domains. Never emits a fabricated URL |
| `src/app/robots.txt/route.ts` | Disallows `/api/`, `/EcosystemAdmin`, `/domain/update/`, `/search`, `/status` |
| `src/lib/jsonld.ts` | Domain and ItemList JSON-LD |
| `src/app/**/layout.tsx`, per-page `metadata` | Titles, descriptions, canonicals, OG/Twitter |

**Weak points.** 🟡 `public/og-image.png` is the square logo renamed, so every social share
is cropped. Copy has twice drifted from reality here — claiming listings were on-chain long
after they moved to Postgres.

---

## 12. UI shell

| File | Role |
|---|---|
| `src/app/layout.tsx`, `loading.tsx`, `not-found.tsx` | Root shell |
| `src/app/providers/query-provider.tsx` | react-query |
| `src/components/header/Header.tsx`, `src/components/Footer.tsx`, `Sidebar.tsx` | Chrome. The sidebar's category list is **derived** from the database, not hard-coded — half of it used to 404 |
| `src/components/ToastProvider.tsx`, `Loader.tsx`, `icons.tsx`, `KaspaDomainsLogo.tsx` | Shared UI |
| `src/app/globals.css`, `tailwind.config.ts`, `components.json` | Styling |
| `src/app/docs/`, `learn/`, `about/`, `terms/`, `privacy/`, `business-plan/` | Content pages |

**Weak points.** `/terms` and `/privacy` are accurate but **not legally reviewed**, and
silent on refunds, operating entity and jurisdiction.

---

## 13. Legacy Kasplex/EVM

**Removed on 2026-09-06** (owner decision). This entry stays as a record, because "why is
there no EVM code in a project whose docs mention Kasplex constantly?" is a reasonable
question to have answered.

The original design put listings, votes, categories and an ecosystem fund in contracts on
Kasplex. **Six of the eight configured addresses had no deployed code** (verified twice by
raw `eth_getCode`), and the two that did failed every call with `invalid opcode: MCOPY` —
Kasplex targets the Shanghai EVM while modern `solc` defaults to Cancun+.

It was kept as a "fallback" for a while. That was a mistake, and an expensive one: because
every read and write carried two branches and one never ran, it directly caused five shipped
bugs — the sompi/wei fee, votes keyed by the wrong address, a permanently-"Unavailable"
counter, an admin page denying its own administrator, and a connect button demanding two
wallets. Removing it deleted 34 files. See `MIND.md` #20.

Gone: `contracts.ts`, `src/abis/**`, `viemClient.ts`, `viemChains.ts` consumers,
`kaswareEvm.ts`, `useKaswareEvmWallet.ts`, `EcosystemAdmin` and its components, `utils.ts`,
and every chain-branch in the data layer and hooks.

**Still on disk, unreachable, and Codex's to resolve**: `src/lib/kasplex.ts`,
`src/lib/viemChains.ts`. `npm run dead:check` lists them.

The intended on-chain future is **Toccata covenants on Kaspa L1**, not a Kasplex redeploy —
see [`Toccata-Dev.md`](./Toccata-Dev.md).

---

## 14. Docs & coordination

**What it does.** How the project remembers what it learned, and how two agents work on it
without colliding.

| File | Role |
|---|---|
| `docs/FILES.md` | The map. **Keep it current — standing rule in `MIND.md`** |
| `docs/kaspadomains-systems.md` | This file |
| `docs/BUGS.md` | What's broken, plus a fixed changelog with evidence |
| `docs/GAPS.md` | What's missing, and the decision blocking each |
| `docs/SPEC.md` | Endpoints, pages, verified contract signatures |
| `docs/ARCHITECTURE.md`, `LIFECYCLE.md`, `PROJECT_PLAN.md`, `BUSINESS_PLAN.md` | How and why |
| `docs/HISTORY.md` | Dated narrative — the *order things were discovered in* |
| `docs/MIND.md` + `docs/mind/**` | Operating principles and runnable checklists |
| `docs/PROPOSED-STRUCTURE.md` | How this file's systems could become actual directories. Proposal |
| `docs/Toccata-Dev.md`, `KASPA_DEVELOPMENT.md` | Ecosystem research and the covenant plan |
| `docs/SECURITY_AUDIT_2026-09-05.md` | Codex's audit — 8 of 9 findings closed |
| `AGENTS.md` | Work split, ground rules, and the message board with Codex |
| `README.md` | Setup, including the TLS-interception pitfall |

---

## Changing a system safely

1. Read this page's entry, then the same files in [`FILES.md`](./FILES.md).
2. If it touches money or anything irreversible:
   [`mind/irreversible-action-checklist.md`](./mind/irreversible-action-checklist.md).
3. If it touches a check or a monitor:
   [`mind/health-check-checklist.md`](./mind/health-check-checklist.md).
4. If it changes a shared function:
   [`mind/shared-function-change-checklist.md`](./mind/shared-function-change-checklist.md).
5. If it claims something about a contract:
   [`mind/verification-checklist.md`](./mind/verification-checklist.md) — verify against the
   live RPC, never the ABI alone.
6. Update `FILES.md` **and this file** in the same change, then `BUGS.md`/`GAPS.md`.
