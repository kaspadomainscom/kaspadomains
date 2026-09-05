# KaspaDomains — Project Plan

Last updated: 2026-09-05

## 1. What this project is

KaspaDomains is a directory/showcase dApp for `.kas` domain names (issued by KNS on the
native Kaspa chain). It runs on **Kasplex**, an EVM-compatible Kaspa L2, and layers a
listing + voting economy on top of domains that already exist on KNS:

- A user proves they own a `.kas` name on KNS (via **Kasware**), then lists it into the
  `KaspaDomainsRegistry` contract on Kasplex (Kasware also signs this, via its EIP-1193
  EVM provider) for a one-time fee of **420 KAS — the real, on-chain-enforced amount**
  (`DOMAIN_FEE` is a contract constant with no setter). The live site's marketing copy
  displays "210 KAS" instead, by explicit request (2026-09-04); `useListDomain.ts` still
  sends the real 420 KAS on-chain, so the two are intentionally out of sync — see
  [`TODO.md`](./TODO.md) for the tracked risk. Cap: 10,000 listings, ever. Listing now
  requires picking at least one category, and owners can attach resources (an X account,
  links) to their domain's profile — see §3.
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
- **Stack**: Next.js 16 (App Router) + React 19, Tailwind v4, viem/ethers for chain access,
  TanStack Query for data fetching, no test framework wired up beyond a placeholder file.
- **Contracts** (all under `src/abis/`, addresses in
  [`src/lib/contracts.ts`](../src/lib/contracts.ts)): `KaspaDomainsRegistry`,
  `DomainLinksStorage`, `DomainDataStorage`, `DomainCategoriesStorage`,
  `DomainVotesManager`, `KDCToken`, `KaspadomainsFund`, plus a `DemoKNS` test contract.
- **Wallet model**: single wallet, Kasware — its L1 methods prove KNS ownership, and its
  EIP-1193 `window.kasware.ethereum` provider signs Kasplex (EVM) transactions. MetaMask
  was removed on 2026-09-04 once this was confirmed against Kasware's own docs (see §3 and
  `TODO.md`). See `src/context/WalletContext.tsx` and `src/hooks/wallet/`.
- **Categories/data**: category membership is fully on-chain, via `DomainCategoriesStorage`
  (`getAllowedCategories`, `updateCategories`, `getDomainsByCategoryPaginated`), read
  through `src/data/categoriesManifest.ts`. Listing now requires picking at least one
  category (see §3). (`src/data/categories/*.ts` — 16 files from an earlier static
  approach, e.g. `100kclub.ts`, `web3.ts`, `meme.ts` — were never imported anywhere and
  were deleted 2026-09-05, see `GAPS.md`.)
- **Security posture**: nonce-based CSP, HSTS, COOP/CORP, and standard hardening headers
  are already wired in `src/proxy.ts` and `next.config.ts` — more mature than most
  early-stage dApps.
- **No CI**: no `.github/workflows`, no automated lint/build/test gate on push.

No prior planning docs existed in the repo before this one — commit history is unlabeled
("Your commit message" / "sdsd"), so this document is the first written source of truth
for direction. Treat everything below as a proposed plan to confirm/adjust with the team,
not an already-agreed roadmap.

## 3. Core listing flow (confirmed working, as of 2026-09-04)

Connect Kasware — its L1 methods prove KNS ownership, its EIP-1193 EVM provider signs the
Kasplex tx — → pick a *verified* KNS domain → pick at least one category from the on-chain
allowed list (now mandatory, previously missing entirely) → pay 420 KAS via
`KaspaDomainsRegistry.listDomain` → on success, the chosen categories are written via
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

1. ~~`src/app/list-domain-test/page.tsx` duplicate~~ — resolved, deleted.
2. **`src/components/DomainForm.tsx`** is disconnected from the real listing flow: its
   submit handler just does `alert('Form submitted (implement actual logic)')` with a
   `// TODO: Add smart contract interaction here`. The real flow
   (`list-domain` → `PickDomainModal` → `useListDomain`) already does this correctly, so
   this component appears to be dead/legacy.
3. **`src/components/CustomizeDomainForm.tsx`** has large blocks of commented-out JSX
   (tagline/bio fields) — half-finished component.
4. ~~Domain profile updates are faked~~ — resolved for the links/resources side (real
   `DomainLinksStorage` write); the general bio/title/image/website side
   (`DomainDataStorage`) is still unwired, see `TODO.md`.
5. **No mainnet configuration** — the whole app currently only knows about Kasplex
   testnet.
6. **No automated tests or CI** — `src/test/a.tsx` is an empty placeholder; nothing runs on
   push/PR.
7. **New**: 25 `react-hooks/set-state-in-effect` lint errors surfaced by the Next.js 16
   upgrade's stricter ruleset — see `TODO.md`.

## 5. Proposed roadmap

This is a starting proposal — confirm priorities with whoever owns the product roadmap
before treating it as committed.

### Phase 0 — Cleanup (low risk, do first)
- Remove or finish `DomainForm.tsx`, `CustomizeDomainForm.tsx` (either delete dead code or
  finish and wire them in — pick one per component; `list-domain-test` already resolved,
  see §4 above).
- Decide the real persistence mechanism for domain profile updates (bio/Twitter/links):
  on-chain write via `DomainDataStorage`/`DomainLinksStorage`, or an off-chain API/DB. Wire
  `domain/update/[name]/page.tsx` to it for real.
- Add a CI workflow (lint + typecheck + build) so regressions are caught before merge.

### Phase 1 — Testnet hardening
- Add automated tests around the contract-interaction hooks (`useListDomain`,
  `useSetDomainCategories`, `VotingSection`'s vote flow, etc.) and the wallet-connection
  flows, since these move real value (KAS/KDC) and are the highest-risk code paths.
- Get a second set of eyes (or a formal audit) on the Solidity contracts before any mainnet
  commitment — this plan only covers the frontend/app layer, not contract security.
- Confirm `updateCategories` access control (owner-only vs. domain-owner-callable) — see §3.

### Phase 2 — Mainnet readiness
- Define and add a Kasplex mainnet chain config alongside testnet (`viemChains.ts`), with
  an env-driven switch rather than a hardcoded chain.
- Deploy production contract addresses and gate `contracts.ts` by network.
- Revisit CSP `connect-src`/`img-src` allowlists in `proxy.ts` for the production
  domain and any new API hosts.

### Phase 2.5 — L1 covenants as the source of truth (new, 2026-09-05)

The Supabase migration was forced by dead contracts, not chosen, and it left listings
authoritative in a mutable database we control. Toccata (live on Kaspa mainnet since
2026-06-30) offers a better end state, and the ownership story is the reason: on L1 the
domain owner's key is the signing key, so ownership becomes a native `checkSig` rather than
the cross-chain inference we currently cannot make.

Target shape — **authoritative chain, disposable index**: listings live in a covenant
family, an indexer projects them into Postgres for querying, and the database stops being
believed. Covenants cannot replace the database (a UTXO set answers no queries), so this is
deliberately hybrid; what changes is which layer is trusted. Votes stay off-chain until
Based Apps ship, since a per-domain counter is the documented anti-pattern.

Blocker to resolve first: what happens when a KNS domain is transferred after listing. A
covenant pinned to the original owner's pubkey will keep trusting it otherwise. Full
analysis in [`Toccata-Dev.md`](./Toccata-Dev.md).

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
- [`SPEC.md`](./SPEC.md) — verified contract addresses and function signatures.
- [`LIFECYCLE.md`](./LIFECYCLE.md) — how a domain/fee/vote flows through the system.
- [`BUSINESS_PLAN.md`](./BUSINESS_PLAN.md) — product/business framing, revenue model,
  positioning.
- [`BUGS.md`](./BUGS.md) — what's broken (open issues + a fixed-bugs changelog).
- [`GAPS.md`](./GAPS.md) — what's missing or incomplete (features, dead code, infra).
- [`MIND.md`](./MIND.md) — operating principles for working on this codebase.
- [`TODO.md`](./TODO.md) — live scratchpad and index, updated by the continuous audit loop.
