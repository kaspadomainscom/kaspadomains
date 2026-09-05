# KaspaDomains — Business Plan

Last updated: 2026-09-05

Positioning note: this plan deliberately does **not** pitch token rewards as part of the
value proposition. The product is a domain listing + discovery service; the underlying
`KDCToken` contract still exists on-chain (votes mint it), but it is not the hook and is
not covered here as a business driver. See [`PROJECT_PLAN.md`](./PROJECT_PLAN.md) and
[`ARCHITECTURE.md`](./ARCHITECTURE.md) for the technical picture.

**Pricing note (2026-09-04):** the live site now *displays* a 210 KAS listing price for
marketing/SEO purposes, by explicit request. The actual on-chain charge is unchanged —
`KaspaDomainsRegistry.DOMAIN_FEE` is a contract constant with no setter (verified against
the ABI), currently 420 KAS, and cannot be changed without deploying a new contract. This
plan describes the real, enforced economics (420 KAS) rather than the displayed marketing
figure; see [`TODO.md`](./TODO.md) for the tracked mismatch and what resolving it would
require.

## 1. Executive summary

> **⚠ The economics below no longer describe the running product. Owner decision,
> 2026-09-05: user data moved to Supabase instead of smart contracts.**
>
> Three things in this plan are now false as written, and they are the three that matter
> most commercially:
>
> 1. **No fee is being collected.** The 420 KAS charge lived in
>    `KaspaDomainsRegistry.listDomain`, which has no deployed code. Listings and votes now
>    go through the database and are **free**. §5's revenue model — 10,000 × 420 KAS —
>    describes a mechanism that currently does not exist. Restoring revenue needs a
>    deliberate choice (a redeployed contract, a plain on-chain payment address checked
>    server-side, or an off-chain processor); none is implemented.
> 2. **Listings are not permanent or on-chain.** They are rows in Postgres, mutable by
>    whoever controls the database. "Recorded permanently on-chain", "one-time payment for
>    exposure for a single payment", and the trust model they imply are not what happens
>    today.
> 3. **Ownership is not enforced the way it was.** The contract used to be what stopped
>    someone listing a name they don't own. Now a server-side signature check proves the
>    submitter controls a Kasplex address, and KNS is read server-side for the true owner —
>    but the two are different keypairs and nothing yet binds them. Listings are stored
>    with `ownership_verified = false` for exactly this reason.
>
> The site's own copy still says otherwise in places (`/docs`, the homepage's "one-time
> payment", the 210 KAS figure). **That copy needs to change or the claims need to become
> true again** — it is a promise shown to users, not an internal detail. Tracked in
> [`GAPS.md`](./GAPS.md); the technical picture is in
> [`ARCHITECTURE.md`](./ARCHITECTURE.md#data-model).
>
> The rest of this document is kept as the pre-migration record, because it still
> describes the intended economics if listings return on-chain.

The core logic is simple: a domain owner pays a one-time **420 KAS** fee, and that listing —
plus its category and any resources attached to it — is recorded permanently on-chain
(Kasplex). That on-chain record is the foundation, not the product. **KaspaDomains' actual
job is what happens on top of it: SEO and additional per-domain data.** A bare on-chain
listing is invisible — no title, no meta tags, no structured data, nothing for a search
engine or a visitor to find. KaspaDomains turns it into an actual indexed, discoverable web
page (see [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the JSON-LD/sitemap/canonical-URL work
this involves), placed in a category, and lets the owner attach data a bare on-chain record
can't carry — an X account, links — so the listing is a real point of contact, not just an
entry in a registry. KaspaDomains never sells, transfers, or brokers `.kas` names — it only
makes a name the owner already controls more findable and more informative.

## 2. Problem

A `.kas` domain on its own is an on-chain ownership record — nothing more. It has no SEO
footprint (no indexable page, no meta tags, no structured data a search engine can read),
isn't categorized, and doesn't tell a visitor anything about who holds it or where to find
them. There's no curated place to browse premium Kaspa-native names by niche (DeFi, gaming,
brandable, business, etc.), and no standard way for an owner to attach identity — an X
account, a website, a Discord — to their domain.

## 3. Solution

A single listing flow, gated by ownership proof on both chains involved:

1. **Prove ownership** — connect Kasware (verifies the `.kas` name on KNS, Kaspa L1).
2. **List it** — pay a one-time **420 KAS** fee via the `KaspaDomainsRegistry` contract on
   Kasplex (Kaspa's EVM L2), signed by Kasware's own EVM provider. No renewals, no
   subscriptions — the listing is permanent.
3. **Categorize it** — pick at least one category from the on-chain allowed list
   (`DomainCategoriesStorage`). This is mandatory: an uncategorized listing can't happen.
4. **Add resources** — attach an X (Twitter) account and any other links (website, Discord,
   docs) to the domain's public profile (`DomainLinksStorage`), so visitors can actually
   reach the owner.
5. **Get discovered** — the domain appears on its category page, in search, and in the
   general `/domains` browser.
6. **Community voting (optional, ongoing engagement)** — anyone can support a listed domain
   for 6 KAS per vote, which raises its visibility/ranking. This is a discovery/ranking
   mechanism, not the product's revenue model.

Hard cap: **10,000 listings, ever** — scarcity is structural, not promotional.

## 4. Target customers

- **`.kas` domain holders** who want their name to be more than a wallet-address
  curiosity — projects, creators, and individuals building a Kaspa-native identity.
- **The Kaspa community at large**, as the audience browsing/discovering domains by
  category and voting on the ones they value.

## 5. Revenue model

- **Primary: listing fees.** 420 KAS per domain, one-time, capped at 10,000 listings.
  Ceiling: 10,000 × 420 KAS = **4,200,000 KAS** in total listing revenue (in KAS terms;
  USD value depends on KAS price at time of listing, which this plan does not project).
- **Secondary: voting fees.** 6 KAS per vote, uncapped and recurring as long as the
  community keeps engaging — a portion goes to the domain owner (per §3 of
  [`ARCHITECTURE.md`](./ARCHITECTURE.md)), the rest funds the ecosystem.
- **Not a marketplace fee.** KaspaDomains does not take a cut of domain sales because it
  does not facilitate domain sales — see §7.

## 6. Product surface (what's actually built)

- Wallet-gated listing flow with mandatory category selection (`/list-domain`).
- Category browsing (`/domains/categories`, `/domains/categories/category/[slug]`) and a
  general domain browser (`/domains`).
- Public domain profile pages (`/domain/[name]`) showing category, status, vote count, and
  attached resources.
- Owner-only resource management (`/domain/update/[name]`) — add/edit an X account and
  links, gated by KNS ownership proof + a Kasware-signed on-chain write.
- Community voting for visibility ranking (`VotingSection`).
- An internal ecosystem-fund admin dashboard (`/EcosystemAdmin`) for operational tracking —
  not customer-facing.

Everything above is live and functioning on **Kasplex testnet**; see
[`TODO.md`](./TODO.md) for what's still open before a mainnet launch (no mainnet chain
config exists yet, no contract audit has been done, no CI).

## 7. Positioning: not a marketplace

KaspaDomains does not sell, resell, or broker `.kas` domains, and does not take custody of
them. Every listing is created and controlled by the wallet that owns the underlying KNS
name. This is a deliberate stance (see `/docs` on the live site, "We Are Not a
Marketplace") — it avoids the legal and trust complications of operating a domain resale
platform, and keeps the product scoped to what it actually is: a discovery and identity
layer on top of ownership that already exists elsewhere.

## 8. Competitive angle

Generic KNS explorers show ownership records. KaspaDomains is the curated, categorized,
identity-enriched layer on top — the difference between a blockchain explorer entry and an
actual profile page someone would link in their bio.

## 9. Risks

- **No mainnet deployment yet** — everything described here runs on Kasplex testnet.
  Revenue projections in §5 are only realizable after a mainnet launch.
- **Contract access control is partly unverified** — e.g. whether a domain owner can call
  `DomainCategoriesStorage.updateCategories` themselves (see `PROJECT_PLAN.md` §3). If
  categorization or resource updates turn out to be admin-gated on the deployed contracts,
  the self-service flows described in §3 need contract changes, not just frontend changes.
- **No contract audit** — the Solidity source isn't even in this repo; a security review is
  a hard prerequisite before real money moves through this on mainnet.
- **Category curation quality** — `getAllowedCategories` is admin-curated; if the category
  list doesn't map well to what people actually list, discovery breaks down regardless of
  the UI.

## 10. Open questions

- Target mainnet launch date, and who owns the contract audit (also tracked in
  [`PROJECT_PLAN.md`](./PROJECT_PLAN.md#6-open-questions-for-the-product-owner)).
- Whether the 6 KAS voting fee split (owner vs. ecosystem) is fixed or something the
  business wants to tune.
- Any planned use for the reserved category-storage-level `KDCToken` mechanics beyond what
  already exists on-chain — out of scope for this plan by request, but worth a explicit
  decision so engineering and marketing stay aligned.

## 11. Related docs

- [`PROJECT_PLAN.md`](./PROJECT_PLAN.md) — technical roadmap and current state.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — contracts, data flow, wallet model.
- [`LIFECYCLE.md`](./LIFECYCLE.md) — how the fee/vote economics described above actually flow.
- [`GAPS.md`](./GAPS.md) — missing features, including the admin-adjustable-fee spec.
- [`BUGS.md`](./BUGS.md) — the displayed-vs-real price mismatch this plan flags, and others.
- [`TODO.md`](./TODO.md) — live scratchpad and index.
