# Architecture

Last updated: 2026-09-05

## Stack

- **Framework**: Next.js 16 (App Router, Turbopack build by default), React 19, TypeScript.
  `src/proxy.ts` (renamed from `middleware.ts` in the v16 upgrade) handles CSP/security
  headers — see [`TODO.md`](./TODO.md#recently-shipped).
- **Styling**: Tailwind CSS v4 + `class-variance-authority`/`tailwind-merge`, shadcn-style
  config in [`components.json`](../components.json) / [`schemas/shadcn-schema.json`](../schemas/shadcn-schema.json).
- **Chain access**: `viem` (primary) and `ethers` (present as a dependency; check usage
  before assuming both are load-bearing).
- **Data fetching/caching**: `@tanstack/react-query`, provider wired in
  `src/app/providers/query-provider.tsx`.
- **Charts**: `recharts`, used in the admin dashboard
  (`src/components/pages/EcosystemAdmin/DistributionChart.tsx`).

## Two chains, one wallet

KaspaDomains bridges two separate chains — Kaspa L1 and Kasplex (an EVM L2) — which is the
central architectural fact of this app. As of 2026-09-04, a single wallet extension,
**Kasware**, covers both:

| Chain | Purpose | Capability | Where |
|---|---|---|---|
| Kaspa L1 (KNS) | Source of truth for `.kas` domain ownership | `window.kasware` (L1 methods) | `src/hooks/wallet/internal/useKaswareWallet.ts`, `src/hooks/kns/**` |
| Kasplex (EVM L2, testnet) | KaspaDomains registry, votes, KDC token, fund | `window.kasware.ethereum` (EIP-1193) | `src/hooks/wallet/internal/useKaswareEvmWallet.ts`, `src/lib/kaswareEvm.ts`, `src/hooks/domain/**`, `src/hooks/domains/**`, `src/lib/contracts.ts` |

Both capabilities are exposed together via `src/context/WalletContext.tsx` as `kasware`
(L1 identity) and `kasplex` (L2 signer) — same underlying wallet, two separate
`requestAccounts()` calls with two different address formats (a Kaspa L1 address vs. an
EVM `0x...` address). Most flows (e.g. listing a domain) still require both connections;
the Header's single "Connect Kasware" button triggers both in sequence. See
`src/app/list-domain/page.tsx` for the canonical example of gating UI on both connection
states.

MetaMask was removed (previously required as a second wallet for Kasplex signing) once
Kasware's EIP-1193 EVM provider was confirmed to cover that job — see
[`TODO.md`](./TODO.md#recently-shipped) for what changed and the testing caveat (this
integration is unverified against a real Kasware extension, only against its documented
API).

`src/hooks/kns/` talks to the external KNS API (`knsdomains.org` / `api.knsdomains.org`,
allowlisted in the CSP `connect-src`) for ownership/availability lookups —
this is off-chain-from-Kasplex's-perspective data about the Kaspa L1 side.

## Smart contracts (Kasplex testnet)

All addresses/ABIs are centralized in [`src/lib/contracts.ts`](../src/lib/contracts.ts):

- **`KaspaDomainsRegistry`** — the core listing contract. `useListDomain`
  (`src/hooks/domain/useListDomain.ts`) calls `listDomain(domain, account)` with
  `value: parseEther('420')`.
- **`DomainDataStorage`** — per-domain metadata (bio, etc.) — currently not written to by
  the UI (see the update-page gap in [`PROJECT_PLAN.md`](./PROJECT_PLAN.md)).
- **`DomainLinksStorage`** — per-domain external links.
- **`DomainCategoriesStorage`** — on-chain category assignment: `getAllowedCategories`
  (admin-curated list), `updateCategories(domainHash, bytes32[])` (assign), `getCategories`
  / `getDomainsByCategoryPaginated` (read). The listing flow now requires picking at least
  one category from `getAllowedCategories` before a domain can be listed — see
  [`useSetDomainCategories`](../src/hooks/domain/useSetDomainCategories.ts) and
  [`PickDomainModal`](../src/components/PickDomainModal.tsx). Whether `updateCategories` is
  callable by the domain owner or admin-only is unverified (no Solidity source in this
  repo) — see the open question in the plan.
- **`DomainVotesManager`** — likes/votes; see
  [`VotingSection.tsx`](../src/components/pages/domain/VotingSection.tsx),
  [`useGetDomainLikeCount.ts`](../src/hooks/domain/useGetDomainLikeCount.ts), and
  [`useMyVotes.tsx`](../src/hooks/domains/useMyVotes.tsx). (`src/hooks/likes/*` and
  `src/hooks/solidity/*` were parallel, unused implementations with the same wrong
  function names the code above used to have — deleted 2026-09-05, see `GAPS.md`.)
- **`KDCToken`** — the reward token minted on votes (2.1M hard cap per product docs).
- **`KaspadomainsFund`** — the ecosystem fund tracked by `/EcosystemAdmin`
  (`src/components/pages/EcosystemAdmin/*`: `FundSummary`, `DistributionChart`,
  `DistributionEventsTable`, `ReceivedEventsTable`, `RecipientsTable`).
- **`DemoKNS`** — a mock/demo KNS contract, presumably for testnet development since real
  KNS lives on Kaspa L1, not Kasplex.

Chain config: `src/lib/viemChains.ts` defines only `kasplexTestnet` (chain id 167012,
RPC `https://rpc.kasplextest.xyz`, explorer `https://frontend.kasplextest.xyz`). Clients:
`src/lib/viemClient.ts` (read), `src/lib/walletClient.ts` (write), `src/lib/kasplexProvider.ts`
/ `src/lib/kasplex.ts` (ethers-based helpers, if still in use).

## Routing map (App Router, `src/app/`)

- `/` — home (`page.tsx`), pulls the category manifest for the "Explore by Category" grid;
  renders `WebSite` + `ItemList` JSON-LD.
- `/domains` — browse/filter all listed domains. `page.tsx` is a client component, so its
  metadata + `ItemList` JSON-LD live in a sibling `layout.tsx`.
- `/domains/categories`, `/domains/categories/category/[category]` — category browsing;
  the `[category]` page renders `ItemList` JSON-LD and a canonical URL.
- `/domains/new-listings`, `/domains/top-voted`, `/domains/my-domains`, `/domains/my-votes`
  — filtered domain views.
- `/domain/[name]` — public domain profile page (`src/components/pages/domain/*`:
  `Detail`, `DomainInfoPanel`, `DomainOwnerBio`, `DomainTitleSection`, `VotingSection`);
  renders `Product` JSON-LD and a canonical URL.
- `/domain/update/[name]` — owner-only resource editing (X account + links), gated on
  Kasware's two capabilities: L1 KNS ownership proof and its EVM provider as the
  `DomainLinksStorage.updateLinks` tx signer. The general bio/title/image/website side
  (`DomainDataStorage`) is still unwired — see `TODO.md`.
- `/list-domain` — the real listing flow (wallet-gated, `PickDomainModal` +
  `useListDomain` + `useSetDomainCategories`; category selection is mandatory).
- `/EcosystemAdmin` — fund/distribution dashboard.
- `/learn` — explainer content (category/resources/voting, no tokenomics — see `TODO.md`).
- `/docs` — in-app product documentation, rebuilt as a sticky-sidebar wiki page (not this
  `docs/` folder).
- `/business-plan` — public page adapting `BUSINESS_PLAN.md` for a general audience.
- `/search` — domain search.
- API routes: `/api/csp-violation-report` (CSP report sink), `/robots.txt`, `/sitemap.xml`
  (generated, not static files).

## Data model

**Two sources, one interface (as of 2026-09-05).** Listings, votes, categories and
resources are read through `src/data/categoriesManifest.ts`, `src/data/domainLookup.ts`
and `src/lib/topVotedDomains.ts`, and those decide at call time where to read from:

| Condition | Source of truth | Path |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` + anon key set | **Supabase (Postgres)** | [`src/data/supabaseSource.ts`](../src/data/supabaseSource.ts) |
| Otherwise | Kasplex contracts | the original on-chain reads, unchanged |

Callers never learn which answered — `supabaseSource` returns the same `Domain` and
`CategoryManifest` shapes the chain path returns. **Why**: four of six contracts have no
deployed code and the other two fail every call (see [`BUGS.md`](./BUGS.md)), so the
product could not function at all on-chain. The chain path was deliberately kept rather
than deleted, so unsetting the env vars restores the previous behaviour exactly, and a
future redeploy doesn't need this work reversed.

**Writes** go through three signed HTTP endpoints rather than contract calls — see the API
table in [`SPEC.md`](./SPEC.md). The client signs a message naming the action, domain,
address and a timestamp (a wallet prompt, not a transaction, so it costs nothing);
[`src/lib/server/verifyRequest.ts`](../src/lib/server/verifyRequest.ts) verifies it
server-side, reads the authoritative owner from KNS, and only then writes with the
service-role key. That file documents precisely what the check proves and what it doesn't,
which matters because the contract used to be the thing enforcing ownership and no longer
is.

### Where this is heading

The current design has Postgres as the source of truth, which was forced rather than
chosen. The intended end state is **authoritative chain, disposable index**:

| Layer | Role |
|---|---|
| L1 covenants (Toccata) | Source of truth for listings — existence, owner pubkey, categories, resource hash |
| Indexer → Postgres | Derived projection, rebuildable from the chain at any time |
| Votes | Stay authoritative in Postgres until Based Apps ship |

Covenants cannot replace the database outright, because a UTXO set answers no queries —
no "all domains in a category", no ranking, no substring search. Every UTXO-chain app
needs an indexer, and an indexer needs a database; KNS itself works this way. What changes
is authority: today, losing Postgres means losing the listings; after the migration it
would mean re-indexing. The read layer already picks a source per call, so an indexer slots
in beside Supabase and the contracts **without page changes** — the write path is the real
work. Full analysis, costs and the unresolved transfer-handling question in
[`Toccata-Dev.md`](./Toccata-Dev.md).

Schema lives in [`supabase/schema.sql`](../supabase/schema.sql). Two things about it are
load-bearing rather than incidental: `domain_hash` is stored as `text` because a uint256
overflows Postgres `bigint`, and it stays the canonical join key so off-chain rows can be
reconciled against chain data later. Row Level Security is on for every table with
**public read and no write policy at all** — the anon key physically cannot write. Writes
go through the server with the service-role key, only after the caller is verified.
Adding a permissive write policy would let anyone list a domain they don't own, since the
contract is no longer the thing enforcing that.

- **On-chain (fallback path)**: domain registration, votes, KDC balances, fund flows —
  read through the `src/hooks/domain/*` and `src/hooks/domains/*` hooks using the
  contracts above. (`src/hooks/solidity/*` was a parallel, entirely unused implementation
  — deleted 2026-09-05, see `GAPS.md`.)
- **KNS (external API)**: ownership/availability of the underlying `.kas` name —
  `src/hooks/kns/api/*`.
- `src/data/types.ts` defines the shared `Domain` interface used by the real,
  on-chain-backed `categoriesManifest.ts`. (`src/data/categories/*.ts`, 16 files from an
  earlier static-category approach, were never imported anywhere and were deleted
  2026-09-05 — see `GAPS.md`.)

## Security

`src/proxy.ts` generates a per-request nonce and sets a strict CSP (`default-src
'none'`, nonce+`strict-dynamic` scripts, explicit `connect-src` allowlist for the Kasplex
RPC, Supabase, and KNS domains), plus HSTS, COOP, and CORP. `next.config.ts` adds
`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and a restrictive
`Permissions-Policy`. This is already in reasonably good shape; the main thing to revisit
before mainnet is whether the allowlisted hosts (especially `connect-src`) still match
production infrastructure.

**Resolved 2026-09-05.** `connect-src` used to allowlist `https://supabase.com` with no
Supabase code anywhere — traced to a commented-out earlier draft of this middleware in
`src/types/db.ts` (deleted). That entry was also simply *wrong* for real use: a Supabase
client never calls the marketing site, it calls the per-project API origin
(`https://<ref>.supabase.co`). Now that Supabase is the primary store, the allowlist entry
is derived from `NEXT_PUBLIC_SUPABASE_URL` and omitted entirely when unset — so it's
correct when configured and absent when not, instead of permanently allowlisting a host
nothing talks to.

Historical note on where that draft came from: it sat alongside a marketplace-
shaped `Domain` interface (`price`, `seller_telegram`, etc.) predating the on-chain-only
data model described above. Still worth confirming with whoever owns infra whether it's
planned or safe to drop from the live CSP.

## Related docs

- [`SPEC.md`](./SPEC.md) — the formal, verified version of the contracts/routes tables above.
- [`LIFECYCLE.md`](./LIFECYCLE.md) — how this architecture is used over time.
- [`BUGS.md`](./BUGS.md) — where the real code deviates from what this doc describes.
- [`GAPS.md`](./GAPS.md) — dead code and infrastructure gaps mentioned above, tracked in detail.
- [`PROJECT_PLAN.md`](./PROJECT_PLAN.md) — current state and roadmap.
- [`TODO.md`](./TODO.md) — live scratchpad and index.
