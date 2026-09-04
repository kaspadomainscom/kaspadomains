# Architecture

Last updated: 2026-09-04

## Stack

- **Framework**: Next.js 15 (App Router), React 19, TypeScript.
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
| Kasplex (EVM L2, testnet) | KaspaDomains registry, votes, KDC token, fund | `window.kasware.ethereum` (EIP-1193) | `src/hooks/wallet/internal/useKaswareEvmWallet.ts`, `src/lib/kaswareEvm.ts`, `src/hooks/solidity/**`, `src/lib/contracts.ts` |

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
- **`DomainVotesManager`** — likes/votes; see `src/hooks/likes/*` and
  `src/hooks/solidity/useDomainLikes.ts` / `useTopVotedDomains.ts`.
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

- **On-chain**: domain registration, votes, KDC balances, fund flows — all read through the
  `src/hooks/solidity/*` hooks using the contracts above.
- **KNS (external API)**: ownership/availability of the underlying `.kas` name —
  `src/hooks/kns/api/*`.
- **`src/data/categories/*.ts`** (14 files) look like an earlier static-category approach.
  They are **not imported anywhere** in the app — dead code, safe to remove unless kept
  intentionally as reference/seed data. `src/data/types.ts` defines the shared `Domain`
  interface used by the real, on-chain-backed `categoriesManifest.ts`.

## Security

`src/middleware.ts` generates a per-request nonce and sets a strict CSP (`default-src
'none'`, nonce+`strict-dynamic` scripts, explicit `connect-src` allowlist for the Kasplex
RPC, Supabase, and KNS domains), plus HSTS, COOP, and CORP. `next.config.ts` adds
`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and a restrictive
`Permissions-Policy`. This is already in reasonably good shape; the main thing to revisit
before mainnet is whether the allowlisted hosts (especially `connect-src`) still match
production infrastructure.

Note: `connect-src` currently allowlists `https://supabase.com` even though no Supabase
usage was found elsewhere in `src/` during this audit — worth confirming whether that's
planned infra or a leftover.
