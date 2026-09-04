# Kaspa Development

Last updated: 2026-09-05

What Kaspa's tech stack actually looks like right now, how this project uses it, and a
concrete plan for developing the Web3/on-chain layer forward. Researched against live
web sources on 2026-09-05 (not training-data memory — see [`MIND.md`](./MIND.md)'s rule
about verifying ecosystem claims against current sources, not assumption). Full source
list at the bottom. Crypto-news sites vary in reliability; anything load-bearing below is
cross-checked against an official Kaspa/Kasplex source where one exists, and dates are
called out so you can re-verify anything time-sensitive before building on it.

## 1. Kaspa L1 today

Kaspa L1 is a proof-of-work **BlockDAG** (not a single-chain blockchain) using the
GHOSTDAG protocol to order parallel blocks instead of orphaning them. Current state:

- **10 blocks/second, 100ms block times** — shipped via the **Crescendo** hard fork,
  activated May 2025. Peak throughput reported around 5,584 TPS.
- **Toccata hard fork — activated 2026-06-30.** This is the single biggest recent change:
  it brought **native covenants** (KIP-17) to L1 — programmable spending rules attached
  directly to UTXOs (not a general-purpose VM, but expressive enough for smart wallets/
  vaults, conditional/escrow payments, native asset issuance, and the L1 side of
  ZK-settlement/bridging protocols). Kaspa's own site (`kaspa.org/build`) describes it as
  a "mainnet-live programmable layer." A new high-level language, **SilverScript**
  (Ori Newman), is emerging for writing these covenant programs.
- **Next up (per Kaspa's own roadmap post)**: a "Covenants++" hard fork (extended
  covenants, a ZK proof verifier, miner payload inspection) targeting mid-2026, and
  **DAGKnight** (2026–2027) targeting 100+ BPS. Treat both as roadmap, not shipped, until
  confirmed closer to the date.
- **Full node**: Rusty Kaspa (Rust), currently v2.0.1, gRPC + UTXO indexing.

**What this means for this project**: Kaspa L1 still has no general-purpose smart-contract
VM — covenants are UTXO-spending rules, not a Solidity-equivalent runtime. This app's
actual contract logic (listing, votes, categories) has nowhere to live on L1 itself; that's
what the L2s below are for. L1 covenants are a real, live capability now, but adopting them
would mean a different tech stack (a Rust/WASM SDK and covenant scripts, not Solidity/viem)
— a future architectural option, not a drop-in extension of the current app.

## 2. Layer 2s: where this app's contracts actually live

### Kasplex — what this project uses today

An EVM-compatible **based rollup** (sequencing/data availability from Kaspa L1, execution
offloaded to L2), using KAS as its only gas token.

| | Testnet (used by this repo) | Mainnet |
|---|---|---|
| RPC | `https://rpc.kasplextest.xyz` | `https://evmrpc.kasplex.org` |
| Explorer | `https://frontend.kasplextest.xyz` | `https://explorer.kasplex.org` |
| Chain ID | 167012 (confirmed live, see `SPEC.md`) | not published in Kasplex's own docs at time of writing — confirm via `eth_chainId` before configuring |
| **EVM version** | **Shanghai** | **Shanghai** (explicit, per Kasplex's own network-info docs) |
| Base fee | 2000 gwei (both) | 2000 gwei |

Timeline: public testnet launched May 2025; **mainnet launched around September 2025** and
is live today. This repo currently only defines `kasplexTestnet` in
[`viemChains.ts`](../src/lib/viemChains.ts) — mainnet is a real, existing migration target
now, not a hypothetical (see `GAPS.md`, which previously described this as further off).

**The critical gotcha, confirmed against Kasplex's own docs**: Kasplex targets the
**Shanghai** EVM hardfork. `MCOPY` (opcode `0x5E`) was introduced in **Cancun**, a later
hardfork Kasplex does not support. Modern Solidity compilers (recent `solc` releases)
default their `--evm-version` to Cancun or later — meaning **any contract compiled without
explicitly pinning `--evm-version shanghai` (or `paris`) will silently emit MCOPY
instructions and revert with `invalid opcode: MCOPY` on Kasplex**, exactly as verified
happening today with `DomainLinksStorage` and `DomainDataStorage` (see `BUGS.md`'s
CRITICAL entries). This is the confirmed root cause, not speculation.

### Igra Network — a separate EVM L2 on Kaspa, not currently used here

Another based rollup on Kaspa's L1, independent of Kasplex. **Public mainnet launched
2026-03-19**, audited by **Sigma Prime** (Ethereum's Lighthouse client team) with a clean
result. Claims 3,000+ TPS, sub-second finality, no centralized sequencer, and
Hyperlane-based cross-chain connectivity; testnet reportedly processed 730k+ transactions
across 21M+ blocks with zero state divergence before mainnet. Worth evaluating as an
alternative deployment target — but switching means redeploying every contract fresh on a
different chain, not a config change, and its EVM-version target (Shanghai/Cancun/other)
should be confirmed directly before assuming compatibility either way.

## 3. Token & naming standards

- **KRC-20** — Kaspa's fungible-token standard, analogous to ERC-20. Historically driven by
  Kasplex's own indexer (an inscription-scanning service, not an L1-native mechanism).
  Some 2026 reporting describes KRC-20 tokens as now also launchable via L1 covenants
  post-Toccata — this project doesn't depend on KRC-20 either way (`KDCToken` is a plain
  Solidity ERC-20 on Kasplex), but worth knowing the standard now has two possible
  execution paths (indexer-based vs. covenant-native) if this ever becomes relevant.
- **KNS (.kas domains)** — the L1 protocol this entire product is built around. Domains are
  inscriptions on Kaspa L1 (arbitrary text/data inscribed directly on-chain, immutable),
  indexed off-chain by KNS's own indexer/API (`knsdomains.org` / `api.knsdomains.org`,
  already allowlisted in this app's CSP). Reported at 50,000+ `.kas` domains inscribed as
  of 2026. This project reads KNS ownership via `src/hooks/kns/**` and Kasware's L1
  methods — see [`ARCHITECTURE.md`](./ARCHITECTURE.md).
- **KCC-0020** — a draft covenant-native token standard for L1. Already assessed in
  `GAPS.md` as "watching, not actionable" — Toccata shipping covenants doesn't change that
  assessment on its own; revisit only if KCC-0020 itself finalizes.

## 4. Developer tooling

- **WASM SDK** (Aspectron) — browser/Node bindings for L1 wallets/transactions.
- **Python SDK** — beta, on GitHub (`kaspanet/kaspa-python-sdk`).
- **Rust** — direct `rusty-kaspa` crates for node-level/backend work.
- **Community REST API** — `api.kaspa.org` (best-effort, no SLA).
- **Kasplex (L2)** — standard EVM tooling applies: this repo already uses `viem` (+
  `ethers`, partially — see `GAPS.md`'s open question on that), Hardhat/Foundry would work
  for contract compilation (**pin `--evm-version shanghai`**, per §2 above), and Kasware is
  the wallet bridging both chains (`window.kasware` for L1, `window.kasware.ethereum`
  EIP-1193 for Kasplex — see `ARCHITECTURE.md`).

## 5. What to implement — concrete recommendations

In priority order, tied to the existing backlog:

1. **Fix the two CRITICAL live-chain bugs in `BUGS.md` before anything else.** Get correct
   current addresses for `KaspaDomainsRegistry`, `DomainVotesManager`,
   `DomainCategoriesStorage`, `KDCToken` (or confirm they need redeploying), and recompile
   `DomainLinksStorage`/`DomainDataStorage` with `--evm-version shanghai` and redeploy.
   Nothing else below matters if the core contracts aren't reachable.
2. **Add a Kasplex mainnet chain definition** (`viemChains.ts`) now that mainnet is a real,
   documented target (`evmrpc.kasplex.org` / `explorer.kasplex.org`) — this was previously
   tracked as "doesn't exist yet" in `GAPS.md`; it exists now. Still needs an env-driven
   network switch (testnet/mainnet), not a hardcoded chain, per `PROJECT_PLAN.md` Phase 2.
3. **Build a repeatable deploy pipeline that pins the EVM version.** Whatever compiles
   these contracts (Hardhat/Foundry config, wherever that lives — it's not in this repo)
   needs `evmVersion: 'shanghai'` set explicitly and checked in, so this class of bug can't
   silently reoccur on a future redeploy or solc upgrade.
4. **Decide whether Igra Network is worth evaluating as a second deployment target**,
   given its recent audited mainnet — a business/architecture decision, not a code change,
   and only after #1–3 are stable on Kasplex.
5. **Treat Kaspa L1 covenants (Toccata) as a distinct future track, not a near-term
   change** — it's a different SDK/language (WASM/Rust/SilverScript, not Solidity), so it
   would mean new functionality alongside the existing Kasplex contracts, not a migration
   of them.

## 6. Plan: building out the Web3 layer

A phased plan, assuming the goal is a working, mainnet-credible on-chain layer for
KaspaDomains. Builds on `PROJECT_PLAN.md`'s existing phases rather than replacing them.

### Phase 0 — Stop the bleeding (blocks everything else)
- Confirm with whoever controls contract deployment: was Kasplex testnet reset? Do current
  addresses exist for Registry/Votes/Categories/KDCToken?
- Recompile `DomainLinksStorage` and `DomainDataStorage` with `--evm-version shanghai`
  (needs the Solidity source, which isn't in this repo — locate or reconstruct it) and
  redeploy; update `contracts.ts` with every corrected address.
- Add a basic **live-chain smoke test** (a script that calls `eth_getCode` on every address
  in `contracts.ts` and fails loudly if any is empty) so this exact failure mode — ABI
  looks right, contract doesn't exist — can never again go unnoticed. This is the concrete
  fix for the gap `MIND.md` principle #10 identifies.
- Add a visible "temporarily unavailable" state to `/list-domain` and voting UI until the
  above is confirmed fixed, given the real fund-loss risk documented in `BUGS.md`.

### Phase 1 — Verify the rest of the surface against live chain, not just the ABI
- Re-run the same live-`eth_call` verification done for `DomainLinksStorage` this session
  against every function in `SPEC.md`'s table, not just the ones already known-broken —
  confirm `updateCategories`/`updateLinks` access control (the long-standing "unverified"
  item in `GAPS.md`) while at it, since a real wallet + working contracts are needed
  anyway.
- Get a second set of eyes (or a formal audit) on the Solidity source once located/fixed —
  still a hard blocker before mainnet per `PROJECT_PLAN.md`.

### Phase 2 — Kasplex mainnet migration
- Add the mainnet chain definition (§5.2) behind an env-driven switch.
- Deploy the (by-then fixed and audited) contract suite to Kasplex mainnet.
- Revisit `proxy.ts`'s CSP `connect-src` for the mainnet RPC/explorer hosts.
- Decide the admin-adjustable-fee question (`GAPS.md`) before or alongside this, since a
  new deployment is already required for that reason too — no sense deploying twice.

### Phase 3 — Optional: evaluate Igra as a second venue, or L1 covenants as new functionality
- Only after Phase 2 is stable. Igra: same contracts, different chain, real audit story to
  point to. L1 covenants: a genuinely new, separate capability (smart wallets/escrow-style
  logic in SilverScript) rather than a replacement for the Kasplex-hosted registry/voting
  logic — evaluate as new product surface, not a migration target.

## Related docs

- [`BUGS.md`](./BUGS.md) — the live-chain failures this doc's root-cause analysis (§2)
  explains and fixes point at.
- [`SPEC.md`](./SPEC.md) — verified contract addresses/signatures for what's deployed today.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — how Kasware/Kasplex/KNS fit together in this
  app's actual code.
- [`GAPS.md`](./GAPS.md) — mainnet config, admin-fee, and access-control gaps referenced
  in the plan above.
- [`PROJECT_PLAN.md`](./PROJECT_PLAN.md) — the roadmap this plan's phases build on.
- [`MIND.md`](./MIND.md) — why everything above was checked against live sources/live RPC
  calls instead of assumed.

## Sources

- [Kaspa: Crescendo Hard-Fork roadmap — 10BPS and more](https://kaspa.org/crescendo-hard-fork-roadmap-10bps/)
- [Kaspa developer docs, SDKs, APIs, node access](https://kaspa.org/build)
- [Kaspa Covenants++ "Toccata" Hard-Fork Outlook — Michael Sutton](https://medium.com/@michaelsuttonil/kaspa-covenants-toccata-hard-fork-outlook-a4d81a40900c)
- [rusty-kaspa Toccata guide (GitHub)](https://github.com/kaspanet/rusty-kaspa/blob/master/docs/toccata-guide.md)
- [Kaspa Toccata Hard Fork: Native Programmability — KaspaHub](https://kaspahub.org/post/kaspa-toccata-hard-fork/)
- [Kasplex L2 network information docs](https://docs-kasplex.gitbook.io/l2-network/build/network-information)
- [Kasplex zkEVM mainnet launch announcement (X/Kasplex)](https://x.com/kasplex/status/1971469795317960800)
- [Kasplex, KRC-20 — Kaspa Wiki](https://wiki.kaspa.org/en/Kasplex_KRC_20)
- [Igra Network public mainnet launch — Chainwire](https://chainwire.org/2026/03/19/igra-network-launches-public-mainnet-as-decentralized-evm-layer-on-kaspas-proof-of-work-blockdag/)
- [KNS Docs — Introduction](https://kns-2.gitbook.io/kns-docs-1/overview)
- [What is a .kas domain? — Kaspa FAQ](https://www.kaspafaq.com/sp_accordion_faqs/what-is-a-kas-domain/)
