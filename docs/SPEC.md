# Technical Spec

Last updated: 2026-09-05

The formal reference: contract addresses, verified function signatures, routes, and data
types. This exists because most of the bugs in [`BUGS.md`](./BUGS.md) were exactly this —
frontend code calling a function name that isn't what the contract actually exports.
**When adding a new contract call, check it against this doc (or re-derive it from the ABI
JSON directly) before writing it — don't assume a name "sounds right."**

Every signature below was read directly from `src/abis/*.json` this session, not assumed.
No Solidity source exists in this repo — these ABIs are the only ground truth available.

**⚠ These contracts are no longer the interface the app uses.** As of 2026-09-05, user
data lives in Supabase and the app reads and writes Postgres, not the chain. This document
is still the correct reference for the contracts themselves — and for the fallback path,
which runs whenever Supabase is unconfigured — but the running write path is the HTTP API
below.

## HTTP API (the current write path)

All three endpoints require a signed request; the payload format and what the signature
does and does not prove are documented in
[`src/lib/server/verifyRequest.ts`](../src/lib/server/verifyRequest.ts). Signing is a
wallet prompt, not a transaction: it costs nothing.

| Endpoint | Method | Replaces | Notes |
|---|---|---|---|
| `/api/domains` | `POST` | `KaspaDomainsRegistry.listDomain` + `DomainCategoriesStorage.updateCategories` | Creates a listing and its categories in one request. At least one category is required. Rolls the listing back if categories fail, so an invisible listing can't be left behind. `409` if already listed. **Charges nothing.** |
| `/api/domains/[name]/vote` | `POST` | `DomainVotesManager.voteDomainByHash` | One vote per wallet per domain, enforced by a unique constraint. `409` on a repeat vote. **Charges nothing.** |
| `/api/domains/[name]/links` | `PUT` | `DomainLinksStorage.updateLinks` | Bulk replace, same semantics as the contract call. Rejects non-`http(s)` URLs (a `javascript:` URL rendered on a public profile is stored XSS). Only the wallet that submitted the listing may edit it. |

Reads go through [`src/data/supabaseSource.ts`](../src/data/supabaseSource.ts); the schema
is [`supabase/schema.sql`](../supabase/schema.sql).

**⚠ Live-chain status (verified 2026-09-05, see [`BUGS.md`](./BUGS.md) for full detail):**
signatures below are correct per the ABI, but as of this writing most of them **cannot
currently be called successfully** against the live RPC — `KaspaDomainsRegistry`,
`DomainVotesManager`, `DomainCategoriesStorage`, and `KDCToken` have **no deployed code**
at their addresses in `contracts.ts` (confirmed via raw `eth_getCode`), and
`DomainLinksStorage`/`DomainDataStorage` **do** have code but every function that touches
a `string`/dynamic-array type fails with `invalid opcode: MCOPY`. Treat this table as the
correct target to code against, not as proof any of it works on-chain today.

## Network

| | |
|---|---|
| Chain | Kasplex Testnet (`kasplexTestnet` in `src/lib/viemChains.ts`) |
| Chain ID | 167012 (`0x28d84`) |
| RPC | `https://rpc.kasplextest.xyz` |
| Explorer | `https://frontend.kasplextest.xyz` |
| Mainnet | **Does not exist in this repo** — see `GAPS.md` |

## Contracts

All addresses from [`src/lib/contracts.ts`](../src/lib/contracts.ts). Full ABIs in
`src/abis/*.json`.

### `KaspaDomainsRegistry` — `0x599DB3Ffbba36FfaAB3f86e92e1fCA0465b2CDeA`

The core listing contract.

| Function | Signature | Notes |
|---|---|---|
| `listDomain` | `(string domain, address to) payable` | Requires `msg.value == DOMAIN_FEE` |
| `DOMAIN_FEE` | `() view returns (uint256)` | **Constant, no setter** — see `GAPS.md` |
| `domainHashPublic` | `(string domain) pure returns (uint256)` | Canonical hash for a domain string |
| `getDomainById` | `(uint256 id) view returns (uint256,string,address,uint256,uint256)` | hash, name, owner, createdAt, feePaid |
| `getListedDomains` | `(uint256 offset, uint256 limit) view returns (uint256[])` | |
| `getDomainsWithNames` | `(uint256 offset, uint256 limit) view returns (uint256[],string[])` | |
| `isHashListed` | `(uint256) view returns (bool)` | |
| `owner` | `() view returns (address)` | Contract owner (for admin-gated calls) |
| `totalDomains`, `totalFeesPaid`, `totalReceivedKas`, `totalUniqueOwners` | `() view returns (uint256)` | Read by `/EcosystemAdmin` |

Used by: [`useListDomain.ts`](../src/hooks/domain/useListDomain.ts) (reads `DOMAIN_FEE()`
live rather than hardcoding it), [`categoriesManifest.ts`](../src/data/categoriesManifest.ts).

### `DomainVotesManager` — `0xbFB179D21A082cBb30ff245b6bCAb8a5b5566bAa`

Community voting. **This is the contract whose real function names were discovered this
session (see `BUGS.md`) — double-check any new code against this table, not against the
old broken code.**

| Function | Signature | Notes |
|---|---|---|
| `voteDomainByHash` | `(uint256 domainHash) payable` | Requires `msg.value == voteFee()`. Takes a **hash**, not the domain name string. |
| `voteFee` | `() view returns (uint256)` | Owner-adjustable |
| `setVoteFee` | `(uint256 newFee)` | Owner-only. The only fee in this whole contract suite with a real setter. |
| `getDomainVoteCount` | `(string domain) view returns (uint256)` | ⚠️ Not `getDomainLikeCount` |
| `hasUserVotedDomain` | `(address user, string domain) view returns (bool)` | ⚠️ Not `hasUserLikedDomain` |
| `getVotedDomainIds` | `(address user) view returns (uint256[])` | ⚠️ Not `getVotesByAddress` |
| `getVotedDomainIdsPaginated` | `(address user, uint256 offset, uint256 limit) view returns (uint256[])` | |
| `getTopVotedDomains` | `(uint256[] domainHashes) view returns (uint256[] votes)` | Batch query — pass many hashes, get many vote counts in one call |
| `userVoteCount` | `(address) view returns (uint16)` | |
| `getUserRemainingVotes` | `(address user) view returns (uint256)` | |
| Event `DomainVoted` | `(address indexed user, uint256 indexed domainHash, uint256 domainVotes, uint256 userVotes)` | ⚠️ Not `DomainLiked` |

Used by: [`VotingSection.tsx`](../src/components/pages/domain/VotingSection.tsx),
[`useGetDomainLikeCount.ts`](../src/hooks/domain/useGetDomainLikeCount.ts) (misleading
filename, calls `getDomainVoteCount`), [`useMyVotes.tsx`](../src/hooks/domains/useMyVotes.tsx),
[`lib/topVotedDomains.ts`](../src/lib/topVotedDomains.ts).

### `DomainCategoriesStorage` — `0x73DeAC4CE5Ae3caCe36F1481B62cb635D9733E0D`

| Function | Signature | Notes |
|---|---|---|
| `getAllowedCategories` | `() view returns (bytes32[])` | Admin-curated allowed list |
| `updateCategories` | `(uint256 domainHash, bytes32[] categories)` | **Access control unverified** — see `GAPS.md` |
| `getCategories` | `(uint256 domainHash) view returns (bytes32[])` | |
| `getDomainsByCategoryPaginated` | `(bytes32 category, uint256 offset, uint256 limit) view returns (uint256[])` | |
| `isDomainIn` | `(bytes32 category, uint256 domainHash) view returns (bool)` | |
| `stringToBytes32` / `bytes32ToString` | conversion helpers | Category names are stored as `bytes32` on-chain |

Used by: [`useGetAllowedCategories.ts`](../src/hooks/domains/useGetAllowedCategories.ts),
[`useSetDomainCategories.ts`](../src/hooks/domain/useSetDomainCategories.ts),
[`categoriesManifest.ts`](../src/data/categoriesManifest.ts) (this is the sole source of
truth for categories — the old `src/data/categories/*.ts` static files were dead code and
were deleted 2026-09-05, see `GAPS.md`).

### `DomainLinksStorage` — `0x1B1D19d94b3355CE1521f9d565B517Bd84AB4B6C`

The "resources" feature (X account, links).

| Function | Signature | Notes |
|---|---|---|
| `getLinks` | `(string domain) view returns (Link[])` | `Link = {string name, string url}` tuple |
| `updateLinks` | `(string domain, Link[] newLinks)` | Bulk replace. **Access control unverified.** |
| `addLink` / `modifyLink` / `removeLink` | per-link mutations | Not used by this app — `updateLinks` (bulk) is simpler |
| `MAX_LINKS` | `() view returns (uint8)` | Read live by the resource editor to cap the UI |

Used by: [`useGetDomainLinks.ts`](../src/hooks/domain/useGetDomainLinks.ts),
[`useUpdateDomainLinks.ts`](../src/hooks/domain/useUpdateDomainLinks.ts).

### `DomainDataStorage` — `0xFd1a17b63478cf58b96c33aBbD4584b300F122b8`

The general "bio" side of a profile (title/description/image/website) — **not wired up
anywhere in the app**, see `GAPS.md`.

| Function | Signature |
|---|---|
| `getDomainData` | `(uint256 domainHash) view returns (string title, string description, string image, string website, uint256 updatedAt)` |
| `updateDomainData` | `(uint256 domainHash, string title, string description, string image, string website)` |

### `KDCToken`, `EcosystemFund`, `DemoKNS`

Present in `contracts.ts`, used by `/EcosystemAdmin` (fund tracking) and mint-on-vote
mechanics. Not re-documented here in detail since the product no longer markets them as
the hook (see `BUSINESS_PLAN.md`'s product-direction note) — but they're still real,
live contracts, not vestigial.

## Wallet integration

Kasware (a single browser extension) provides both capabilities the app needs — see
[`LIFECYCLE.md`](./LIFECYCLE.md#2-wallet-connection-lifecycle) for the connection flow.

| Capability | Provider | Detection | Hook |
|---|---|---|---|
| Kaspa L1 / KNS ownership proof | `window.kasware` | `window.kasware` exists | `useKaswareWallet.ts` |
| Kasplex (EVM L2) tx signing | `window.kasware.ethereum` (EIP-1193) | `.isKasWare` flag, own namespace (no collision risk with other wallets) | `useKaswareEvmWallet.ts` |

MetaMask was removed entirely (see `BUGS.md`'s Fixed list) — do not re-add MetaMask-specific
code; route all EVM signing through `lib/kaswareEvm.ts`'s shared helper.

## Routes

| Route | Type | Notes |
|---|---|---|
| `/` | Server | Home, real JSON-LD, real trending data |
| `/domains` | Client + `layout.tsx` | Browse/search all listings |
| `/domains/categories` | Server | Category index |
| `/domains/categories/category/[category]` | Server | One category, breadcrumbs |
| `/domains/top-voted` | Server | Ranked by real vote counts |
| `/domains/my-domains`, `/domains/my-votes` | Client | Wallet-scoped views |
| `/domains/new-listings` | Client | **Non-functional, see `GAPS.md`** |
| `/domain/[name]` | Server | Public profile, `ProfilePage` JSON-LD |
| `/domain/update/[name]` | Client | Owner-only resource editor |
| `/list-domain` | Client | The real listing flow |
| `/EcosystemAdmin` | Client | Internal fund dashboard, not public-facing |
| `/docs`, `/learn`, `/business-plan` | Mixed | Explainer content |
| `/search` | Client + `layout.tsx` | `noindex` |
| `/sitemap.xml`, `/robots.txt` | Route handlers | Generated, not static files |

## Related docs

- [`BUGS.md`](./BUGS.md) — where code deviates from this spec.
- [`GAPS.md`](./GAPS.md) — what's not built yet.
- [`LIFECYCLE.md`](./LIFECYCLE.md) — how these pieces flow together over time.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — the narrative version of this document.
