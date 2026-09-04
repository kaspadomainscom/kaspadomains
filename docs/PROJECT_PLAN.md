# KaspaDomains — Project Plan

Last updated: 2026-09-04

## 1. What this project is

KaspaDomains is a directory/showcase dApp for `.kas` domain names (issued by KNS on the
native Kaspa chain). It runs on **Kasplex**, an EVM-compatible Kaspa L2, and layers a
listing + voting economy on top of domains that already exist on KNS:

- A user proves they own a `.kas` name on KNS (via the **Kasware** wallet), then lists it
  into the `KaspaDomainsRegistry` contract on Kasplex (via **MetaMask**) for a one-time
  fee of 420 KAS. Cap: 10,000 listings, ever. Listing now requires picking at least one
  category, and owners can attach resources (an X account, links) to their domain's
  profile — see §3.
- Other users can vote/support a listed domain for 6 KAS per vote, which boosts its
  visibility/ranking.
- Listed domains get a profile page, category placement, search visibility, and a public
  "ecosystem fund" that the admin panel (`/EcosystemAdmin`) reports on.

This is **not** a domain marketplace — KaspaDomains does not sell or transfer `.kas` names,
it only indexes/showcases names a user already owns on KNS. See
[`src/app/docs/page.tsx`](../src/app/docs/page.tsx) for the user-facing explanation, and
[`BUSINESS_PLAN.md`](./BUSINESS_PLAN.md) for the product/business framing.

**Product-direction note (2026-09-04):** the site's copy no longer pitches KDC/token
rewards as the hook — the business decision is to lead with listing + categories +
resources instead (see `BUSINESS_PLAN.md`). The `KDCToken` contract still exists and votes
still mint it on-chain; this was a messaging change, not a contract change.

## 2. Current state (as of this audit)

- **Network**: Kasplex **testnet only** (`kasplexTestnet`, chain id 167012,
  `rpc.kasplextest.xyz`). No mainnet chain config exists yet. See
  [`src/lib/viemChains.ts`](../src/lib/viemChains.ts).
- **Stack**: Next.js 15 (App Router) + React 19, Tailwind v4, viem/ethers for chain access,
  TanStack Query for data fetching, no test framework wired up beyond a placeholder file.
- **Contracts** (all under `src/abis/`, addresses in
  [`src/lib/contracts.ts`](../src/lib/contracts.ts)): `KaspaDomainsRegistry`,
  `DomainLinksStorage`, `DomainDataStorage`, `DomainCategoriesStorage`,
  `DomainVotesManager`, `KDCToken`, `KaspadomainsFund`, plus a `DemoKNS` test contract.
- **Wallet model**: dual-wallet by design — Kasware for Kaspa/KNS ownership proof,
  MetaMask for Kasplex (EVM) transactions. See `src/context/WalletContext.tsx` and
  `src/hooks/wallet/`.
- **Categories/data**: category membership is fully on-chain, via `DomainCategoriesStorage`
  (`getAllowedCategories`, `updateCategories`, `getDomainsByCategoryPaginated`), read
  through `src/data/categoriesManifest.ts`. Listing now requires picking at least one
  category (see §3). The TypeScript files under `src/data/categories/*.ts` (e.g.
  `100kclub.ts`, `web3.ts`, `meme.ts`) look like an earlier static approach and are dead
  code — not imported anywhere in the app.
- **Security posture**: nonce-based CSP, HSTS, COOP/CORP, and standard hardening headers
  are already wired in `src/middleware.ts` and `next.config.ts` — more mature than most
  early-stage dApps.
- **No CI**: no `.github/workflows`, no automated lint/build/test gate on push.

No prior planning docs existed in the repo before this one — commit history is unlabeled
("Your commit message" / "sdsd"), so this document is the first written source of truth
for direction. Treat everything below as a proposed plan to confirm/adjust with the team,
not an already-agreed roadmap.

## 3. Core listing flow (confirmed working, as of 2026-09-04)

Connect Kasware (proves KNS ownership) + MetaMask (signs the Kasplex tx) → pick a
*verified* KNS domain → pick at least one category from the on-chain allowed list (now
mandatory, previously missing entirely) → pay 420 KAS via `KaspaDomainsRegistry.listDomain`
→ on success, the chosen categories are written via
`DomainCategoriesStorage.updateCategories`. See
[`useListDomain`](../src/hooks/domain/useListDomain.ts),
[`useSetDomainCategories`](../src/hooks/domain/useSetDomainCategories.ts), and
[`PickDomainModal`](../src/components/PickDomainModal.tsx).

Every listed domain's profile page, the category page it belongs to, the `/domains`
browser, and the homepage now render real JSON-LD structured data and correct canonical
URLs, and `sitemap.xml` links to the correct (previously broken) URLs — see
[`TODO.md`](./TODO.md#recently-shipped) for what changed and why.

Open risk: whether `DomainCategoriesStorage.updateCategories` is callable by a domain's
owner or is admin-only couldn't be verified (no Solidity source in this repo) — flagged in
the TODO list, worth confirming on testnet.

Separately, domain owners can now attach resources — an X (Twitter) account and other
links — to their domain's profile at `/domain/update/[name]`, written to
`DomainLinksStorage.updateLinks` and rendered publicly on `/domain/[name]`. Same unverified
access-control risk as above applies to this contract too.

## 4. Known gaps found during this audit

These are concrete, code-verified issues (not speculation) — see
[`TODO.md`](./TODO.md) for the actionable checklist:

1. **`src/app/list-domain-test/page.tsx` is a byte-for-byte duplicate** of
   `src/app/list-domain/page.tsx` — looks like scaffolding left behind.
2. **`src/components/DomainForm.tsx`** is disconnected from the real listing flow: its
   submit handler just does `alert('Form submitted (implement actual logic)')` with a
   `// TODO: Add smart contract interaction here`. The real flow
   (`list-domain` → `PickDomainModal` → `useListDomain`) already does this correctly, so
   this component appears to be dead/legacy.
3. **`src/components/CustomizeDomainForm.tsx`** has large blocks of commented-out JSX
   (tagline/bio fields) — half-finished component.
4. **Domain profile updates are faked**: `src/app/domain/update/[name]/page.tsx` simulates
   saving bio/Twitter with `await new Promise((resolve) => setTimeout(resolve, 600))` and a
   `// TODO: Call actual API to update bio and Twitter handle` — there is no real
   persistence path yet (no API route or contract write wired up).
5. **No mainnet configuration** — the whole app currently only knows about Kasplex
   testnet.
6. **No automated tests or CI** — `src/test/a.tsx` is an empty placeholder; nothing runs on
   push/PR.

## 5. Proposed roadmap

This is a starting proposal — confirm priorities with whoever owns the product roadmap
before treating it as committed.

### Phase 0 — Cleanup (low risk, do first)
- Remove or finish `list-domain-test`, `DomainForm.tsx`, `CustomizeDomainForm.tsx` (either
  delete dead code or finish and wire them in — pick one per component).
- Decide the real persistence mechanism for domain profile updates (bio/Twitter/links):
  on-chain write via `DomainDataStorage`/`DomainLinksStorage`, or an off-chain API/DB. Wire
  `domain/update/[name]/page.tsx` to it for real.
- Add a CI workflow (lint + typecheck + build) so regressions are caught before merge.

### Phase 1 — Testnet hardening
- Add automated tests around the contract-interaction hooks (`useListDomain`,
  `useLikeDomain`, `useRegisterDomain`, etc.) and the wallet-connection flows, since these
  move real value (KAS/KDC) and are the highest-risk code paths.
- Get a second set of eyes (or a formal audit) on the Solidity contracts before any mainnet
  commitment — this plan only covers the frontend/app layer, not contract security.
- Confirm `updateCategories` access control (owner-only vs. domain-owner-callable) — see §3.

### Phase 2 — Mainnet readiness
- Define and add a Kasplex mainnet chain config alongside testnet (`viemChains.ts`), with
  an env-driven switch rather than a hardcoded chain.
- Deploy production contract addresses and gate `contracts.ts` by network.
- Revisit CSP `connect-src`/`img-src` allowlists in `middleware.ts` for the production
  domain and any new API hosts.

### Phase 3 — Growth features
- Anything beyond the current MVP (search improvements, richer profile pages, additional
  reward mechanics, etc.) — intentionally left open until Phases 0–2 are done, so this plan
  doesn't lock in speculative scope.

## 6. Open questions for the product owner

- Is `DomainForm.tsx` / `CustomizeDomainForm.tsx` meant to be finished, or safe to delete?
- What should back domain profile updates (bio/Twitter/links) — a contract write, or an
  off-chain API? This blocks closing gap #4 above.
- Is there a target mainnet launch date driving priority between Phase 1 and Phase 2?
- Who owns contract security review before mainnet?
- Can a domain owner call `DomainCategoriesStorage.updateCategories` themselves, or is it
  admin-only? Affects whether the listing flow's category step (§3) works unmodified.

## 7. Related docs

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — technical map of contracts, data flow, wallets.
- [`BUSINESS_PLAN.md`](./BUSINESS_PLAN.md) — product/business framing, revenue model,
  positioning.
- [`TODO.md`](./TODO.md) — flat, actionable task list derived from this plan.
