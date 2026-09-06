# Lifecycle

Last updated: 2026-09-06

How a `.kas` name actually moves through this system — from existing only on Kaspa L1 to
being a fully-featured listing on KaspaDomains. For the underlying contracts and hooks
behind each step, see [`SPEC.md`](./SPEC.md); for what's still unverified, see
[`GAPS.md`](./GAPS.md#unverified-not-gaps-or-bugs--genuinely-unknown-needs-testing).

## 0. The lifecycle (Supabase)

This is what happens. Sections 1–4 below describe the **historical** on-chain lifecycle,
kept as a record of what the product used to be — that code was deleted on 2026-09-06 and
none of it runs. Do not read them as a fallback; there is no fallback.

```
Registered on KNS (Kaspa L1)
        │
        │  owner connects Kasware
        ▼
Verified on KNS ──► the app reads the owner from KNS server-side; the client
        │           cannot assert who owns a name
        │
        │  POST /api/domains/preflight — signed, FREE, no side effects.
        │  Checks write-readiness, ownership, whether it's already listed, and
        ▼  the categories. Nothing has been paid yet.
Cleared to pay ──► a 10-minute payment intent bound to action + domain +
        │           signer + amount, and the price to pay
        │
        │  pay the quoted amount on L1 to the treasury, then sign with the L1 key
        │  POST /api/domains with paymentTxId + intent — the server re-verifies
        ▼  everything from scratch: signature, KNS owner, payment, payer
Listed in Postgres  ──► row in `domains`, owner = whatever KNS said,
        │                submitted_by = the proven L1 address,
        │                ownership_verified = TRUE, payment_tx_id = the txid,
        │                and the receipt claimed in the global `payment_receipts`
        │                ledger so it can never fund a second action
        │
        │  categories are written in the same request — a listing with none
        ▼  would be invisible to every browse page
Categorized ──► rows in `domain_categories`
        │
        │  PUT /api/domains/[name]/categories — signed, owner-only, free,
        │  bulk replace, allow-list enforced. Recategorising later is possible.
        │
        │  PUT /api/domains/[name]/links — signed, owner-only, bulk replace
        ▼
Resourced ──► rows in `domain_links` ──► public profile, JSON-LD, sitemap
        │
        │  same preflight-then-pay order:
        │  POST /api/domains/preflight (action: vote) — confirms the domain is
        │  listed and this wallet hasn't voted — then 1 KAS, then
        ▼  POST /api/domains/[name]/vote with paymentTxId + intent
Voted on ──► rows in `votes`; counts are a view, so they can't drift
```

**Money is the last uncertain step, never the first (since 2026-09-06).** The browser used
to pay first and discover afterwards whether the server could act — and it decided to use
this path from the *public* Supabase key while the server needs a *different*, server-only
one. A deployment with the first and not the second took 200 KAS and answered 503. Kaspa
transactions are irreversible, so that was simply lost. Everything that can fail now runs
before the wallet is asked.

**What is proven at each step (updated 2026-09-05).** The request is signed with the
**Kaspa L1 key** — the same key that owns the name on KNS. The server verifies the
signature, derives the `kaspa:` address from the signing public key, reads the real owner
from KNS, and requires them to match. So **only the owner can list a domain or change its
listing**, and because the check runs against KNS on every request rather than against
whoever listed it first, a domain that changes hands immediately follows its new owner.

The earlier design signed with the Kasplex EVM key, which is a different keypair from the
one that owns the name, and so could not prove ownership at all. That is why
`ownership_verified` exists; rows written under the new path set it true.

**Fees, as of 2026-09-05**: listing costs 200 KAS and each vote 1 KAS, paid on Kaspa L1
to a treasury address and verified server-side from the transaction id. The payment must
come **from the signer's own address** — otherwise a txid lifted off the public ledger
would spend a stranger's fee — and each one is claimed in a single global ledger, so a
200 KAS listing receipt cannot also be spent on a 1 KAS vote. No contract is involved.

**What is still not true of a listing**: it is not permanent and not on-chain — rows
remain mutable by whoever holds the database. And the paid write is still not atomic: a
payment can be made and the write fail if the network drops between them (see
[`GAPS.md`](./GAPS.md), SA-08).

**Where this lifecycle is heading.** The intended end state moves the listing steps onto
Kaspa L1 covenants, so "listed" becomes a covenant UTXO rather than a row, and ownership is
enforced by signature instead of inferred. Postgres stays — it becomes the index that
answers the queries a UTXO set cannot — but stops being the source of truth. Voting keeps
this shape until Based Apps ship. See [`Toccata-Dev.md`](./Toccata-Dev.md).

## 1. Domain lifecycle (on-chain — HISTORICAL, deleted 2026-09-06)

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
