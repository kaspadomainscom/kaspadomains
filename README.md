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
which is the live index.

> **Working on this repo with an AI agent?** Read [`AGENTS.md`](./AGENTS.md) first — Codex
> and Claude both work here in parallel, and it holds the work split, ground rules, and the
> board they use to coordinate.

The index currently points to:

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

### Database (optional, but it's what makes the app work today)

Supabase is the primary store for listings, votes and categories. Without it the app
falls back to reading the Kasplex contracts — which currently fail, since four of them
have no deployed code (see [`docs/BUGS.md`](./docs/BUGS.md)).

1. Create a project at [supabase.com](https://supabase.com).
2. Run [`supabase/schema.sql`](./supabase/schema.sql) in its SQL editor. **Leave Row Level
   Security enabled** — the schema turns it on with public read and no write policy, which
   is what stops the browser-visible key writing directly to the database and bypassing
   the owner-only API.
3. `cp .env.example .env.local` and fill in the values from Project Settings → API.
4. Set `NEXT_PUBLIC_KASPADOMAINS_TREASURY_ADDRESS` to a Kaspa address you control — the
   200 KAS listing and 1 KAS vote fees are paid to it. Paid actions stay disabled until
   it is set, rather than silently becoming free.

**Auth note:** the only login is Kasware. Supabase Auth is deliberately unused — no
email, no social, no `@supabase/ssr` session cookies. Identity comes from a Kaspa L1
signature verified server-side, so adding a second auth system would create a second,
weaker way in.

The `service_role` key is server-only and bypasses Row Level Security — never prefix it
with `NEXT_PUBLIC_`. With no keys set, the app still builds and runs; it just reads from
the chain instead.

Open [http://localhost:3000](http://localhost:3000). You'll need the
[Kasware](https://www.kasware.xyz/) browser extension to exercise wallet-gated flows
(listing, voting, editing resources) against Kasplex testnet.

Other scripts: `npm run build`, `npm run lint`, `npm run start`.

## Contract addresses

Kasplex testnet addresses and ABIs are centralized in
[`src/lib/contracts.ts`](./src/lib/contracts.ts); verified function signatures are in
[`docs/SPEC.md`](./docs/SPEC.md). No mainnet deployment exists yet.
