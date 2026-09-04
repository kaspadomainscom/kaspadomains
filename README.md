# KaspaDomains

A directory/discovery dApp for `.kas` domain names (issued by KNS on Kaspa L1). Owners
prove ownership via **Kasware**, list their domain on **Kasplex** (an EVM-compatible
Kaspa L2) for a one-time fee, pick a category, and can attach resources (an X account,
links) to their domain's public profile. Other users can vote on listed domains to boost
their visibility. KaspaDomains is **not a marketplace** — it never sells, transfers, or
brokers `.kas` names; it only makes a name the owner already controls more findable.

Currently live on **Kasplex testnet** only.

## Documentation

Full project documentation lives in [`docs/`](./docs). Start at [`docs/TODO.md`](./docs/TODO.md),
which is the live index — it currently points to:

- [`docs/PROJECT_PLAN.md`](./docs/PROJECT_PLAN.md) — current state and roadmap
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — technical architecture (stack, contracts, routing)
- [`docs/SPEC.md`](./docs/SPEC.md) — verified contract addresses and function signatures
- [`docs/LIFECYCLE.md`](./docs/LIFECYCLE.md) — how a domain/fee/vote flows through the system
- [`docs/BUSINESS_PLAN.md`](./docs/BUSINESS_PLAN.md) — product/business framing
- [`docs/KASPA_DEVELOPMENT.md`](./docs/KASPA_DEVELOPMENT.md) — current Kaspa/Kasplex/Igra
  ecosystem state and a plan for developing the on-chain layer forward
- [`docs/HISTORY.md`](./docs/HISTORY.md) — dated narrative history of development sessions
- [`docs/BUGS.md`](./docs/BUGS.md) — what's currently broken, and a fixed-bugs changelog
- [`docs/GAPS.md`](./docs/GAPS.md) — what's missing or incomplete
- [`docs/MIND.md`](./docs/MIND.md) — operating principles for working on this codebase

## Stack

Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4, viem for chain
access, TanStack Query for data fetching. See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
for the full picture.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll need the
[Kasware](https://www.kasware.xyz/) browser extension to exercise wallet-gated flows
(listing, voting, editing resources) against Kasplex testnet.

Other scripts: `npm run build`, `npm run lint`, `npm run start`.

## Contract addresses

Kasplex testnet addresses and ABIs are centralized in
[`src/lib/contracts.ts`](./src/lib/contracts.ts); verified function signatures are in
[`docs/SPEC.md`](./docs/SPEC.md). No mainnet deployment exists yet.
