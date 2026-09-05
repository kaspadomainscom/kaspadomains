# Lifecycle

Last updated: 2026-09-05

How a `.kas` name actually moves through this system — from existing only on Kaspa L1 to
being a fully-featured listing on KaspaDomains. For the underlying contracts and hooks
behind each step, see [`SPEC.md`](./SPEC.md); for what's still unverified, see
[`GAPS.md`](./GAPS.md#unverified-not-gaps-or-bugs--genuinely-unknown-needs-testing).

## 0. The current lifecycle (Supabase, since 2026-09-05)

This is what actually happens today. Sections 1–4 below describe the on-chain lifecycle,
which is still in the code as a fallback but is not the running path.

```
Registered on KNS (Kaspa L1)
        │
        │  owner connects Kasware
        ▼
Verified on KNS ──► the app reads the owner from KNS server-side; the client
        │           cannot assert who owns a name
        │
        │  POST /api/domains — wallet signs the request (free, no transaction)
        ▼
Listed in Postgres  ──► row in `domains`, owner = whatever KNS said,
        │                submitted_by = the proven Kasplex address,
        │                ownership_verified = FALSE (see below)
        │
        │  categories are written in the same request — a listing with none
        ▼  would be invisible to every browse page
Categorized ──► rows in `domain_categories`
        │
        │  PUT /api/domains/[name]/links — signed, bulk replace
        ▼
Resourced ──► rows in `domain_links` ──► public profile, JSON-LD, sitemap
        │
        │  POST /api/domains/[name]/vote — signed, free, one per wallet
        ▼
Voted on ──► rows in `votes`; counts are a view, so they can't drift
```

**What is and isn't proven at each step.** The signature proves the requester controls the
Kasplex (EVM) address it names, and the KNS lookup happens server-side so ownership can't
be asserted by the client. What is *not* proven is that those are the same person — the
Kaspa L1 key that owns the name and the EVM key that signed are different keypairs. So a
row records a true owner (from KNS) but an unverified claim to it, which is why
`ownership_verified` exists and defaults to false. Anything that treats a listing as
authoritative has to check that flag.

**What is no longer true of a listing**: it is not permanent, not on-chain, and not paid
for. Rows are mutable by whoever holds the database, and both the 420 KAS listing fee and
the 6 KAS vote fee are uncollected because the contracts that charged them are gone.

## 1. Domain lifecycle (on-chain — fallback path, not currently running)

```
Registered on KNS (Kaspa L1)
        │
        │  proven via Kasware (its L1 methods)
        ▼
Verified ownership ──────────────────────────────┐
        │                                         │
        │  useListDomain (pays 420 KAS,           │  domain never listed here:
        │  KaspaDomainsRegistry.listDomain)        │  invisible to KaspaDomains,
        ▼                                          │  no SEO footprint, no resources
Listed on Kasplex ◄───────────────────────────────┘
        │
        │  mandatory at listing time — useSetDomainCategories
        ▼
Categorized (≥1 category, DomainCategoriesStorage)
        │
        │  optional, anytime after listing — useUpdateDomainLinks
        ▼
Resourced (X account + links, DomainLinksStorage) ──► discoverable: real page,
        │                                              JSON-LD, sitemap entry,
        │  optional, ongoing — anyone can vote           category placement
        ▼
Voted on (6 KAS/vote, DomainVotesManager) ──► ranked on /domains/top-voted,
                                                mints KDC to voter + owner
```

Once listed, a domain is **permanent** — there's no unlist, no edit-the-listing-itself,
no renewal. The only things an owner can change after listing are its categories and its
resources (both write to separate storage contracts, not the registry). Community voting
is open-ended and ongoing; there's no end state for it beyond "however many votes it has
accumulated."

### What "not listed" looks like

A `.kas` name that exists on KNS but was never listed here is invisible to KaspaDomains
entirely — no profile page, no category placement, no search visibility, no JSON-LD, no
sitemap entry. This is the gap the whole product exists to close (see
[`BUSINESS_PLAN.md`](./BUSINESS_PLAN.md)): an unlisted domain is just an on-chain ownership
record with zero discoverability.

## 2. Wallet connection lifecycle

Both capabilities below come from the **same** Kasware extension (see `SPEC.md` for why
MetaMask was removed) — a single "Connect Kasware" action triggers both in sequence.

```
Disconnected
    │
    │  Header "Connect Kasware" button
    ▼
Connecting kasware (L1) + kasplex (L2 EVM signer) in sequence
    │
    ├─ kasware only connected  → can prove KNS ownership, can't sign Kasplex txs
    ├─ kasplex only connected  → can sign Kasplex txs, can't prove KNS ownership
    └─ both connected          → full read/write access: list, categorize,
                                   add resources, vote, manage owned domains
```

Most write actions (listing, editing categories/resources) require **both** — one proves
you own the name on L1, the other signs the transaction that actually changes state on
Kasplex. Voting only requires `kasplex` (no ownership claim involved).

## 3. Fee / economics lifecycle

```
User pays listing fee (displayed: 210 KAS / actually charged: 420 KAS — see BUGS.md
for this tracked mismatch)
        │
        ▼
KaspaDomainsRegistry receives KAS
        │
        ▼
totalFeesPaid / totalReceivedKas incremented (read by /EcosystemAdmin)
```

```
User votes (6 KAS, read live from DomainVotesManager.voteFee() — not hardcoded)
        │
        ▼
DomainVotesManager: portion → domain owner, rest → ecosystem fund
        │
        ▼
KDC minted to both the voter and the domain owner (KDCToken — not marketed as the
hook anymore, see BUSINESS_PLAN.md's "Product-direction note", but still real and
happening on-chain on every vote)
```

`/EcosystemAdmin` is the operational view into all of this — fund totals, distribution
history, recipient tracking. It's an internal tool, not customer-facing (see
`ARCHITECTURE.md`).

## 4. Data lifecycle (what's on-chain vs. computed client-side)

| Data | Source of truth | Where it's read |
|---|---|---|
| Domain ownership on KNS | Kaspa L1 (KNS contracts) | `useKasware.ts`, `useOwnedDomains.ts` |
| Listing existence, owner, fee paid | `KaspaDomainsRegistry` (Kasplex) | `categoriesManifest.ts` |
| Category membership | `DomainCategoriesStorage` (Kasplex) | `categoriesManifest.ts` |
| Vote counts, voter list | `DomainVotesManager` (Kasplex) | `VotingSection.tsx`, `topVotedDomains.ts` |
| Resources (X account, links) | `DomainLinksStorage` (Kasplex) | `useGetDomainLinks.ts` |
| "Trending" domains ticker (header) | `trending` category via `categoriesManifest` | `Header.tsx` |

> **Changed 2026-09-05.** The paragraph below described the app before Supabase became
> the primary store. It is kept because it still describes the *on-chain* path exactly,
> and that path remains in the code and takes over whenever Supabase isn't configured.
> What is no longer true is the "no off-chain database" claim itself: with
> `NEXT_PUBLIC_SUPABASE_URL` set, listings, votes, categories and resources are both read
> from and written to Postgres, and the contracts are not consulted at all. See
> [`ARCHITECTURE.md`](./ARCHITECTURE.md#data-model) for the current picture.

There is **no off-chain database** anywhere in this app — every piece of domain data
either comes from a live contract read or is static site content (docs, business plan
copy). This matters for the "gaps" tracked elsewhere: when a contract read fails (RPC
down, wrong function name, wrong chain), there's no cache/fallback with stale-but-plausible
data — the UI either shows a real empty/error state, or (before this session's fixes) a
stuck loading spinner or fabricated placeholder data.

## Related docs

- [`SPEC.md`](./SPEC.md) — the contracts, hooks, and routes behind each step above.
- [`BUGS.md`](./BUGS.md) — where a lifecycle step is currently broken.
- [`GAPS.md`](./GAPS.md) — where a lifecycle step is missing entirely (e.g. no way to
  unlist, no bio/description field wired up).
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — the technical architecture this lifecycle runs on.
