# Toccata Dev Guide — replacing the database with Kaspa L1 covenants

**Purpose**: everything needed to evaluate and eventually execute a move of KaspaDomains'
user data from Supabase to Kaspa L1 covenants, plus the reference links to build from.

Last updated: 2026-09-05. Researched against [docs.kaspa.org/toccata](https://docs.kaspa.org/toccata)
and its sub-pages on that date — this is a fast-moving stack, so re-check before acting.
**Nothing here has been built or tested by us.** Treat every claim as sourced-but-unproven
(see [`MIND.md`](./MIND.md) principle #10).

## Why this matters for us specifically

The database migration ([`ARCHITECTURE.md`](./ARCHITECTURE.md#data-model)) was forced: the
Kasplex contracts died and the product could not run. It left one gap we could not close —
**we cannot prove a listing request comes from the domain's real owner**, because the KNS
owner holds a Kaspa L1 key while our signature check proves control of a Kasplex EVM key,
and nothing binds the two. Every row is stored `ownership_verified = false` because of it.

Toccata makes that gap disappear rather than shrinking it. On L1, the owner's key *is* the
key that signs, so ownership becomes a native `checkSig` inside the covenant instead of a
cross-chain inference. **That, not decentralisation in the abstract, is the strongest
technical argument for this migration.**

## What Toccata is

Kaspa's programmability stack, **active on mainnet since 2026-06-30** (DAA score
474,165,565). It makes UTXOs "expressive enough to carry real application state" — not a
general VM with accounts, but programmable spending rules over the UTXO set.

Components, per the official guide:

| Piece | What it does |
|---|---|
| **Covenants** | Spending rules that constrain what the *next* transaction may look like |
| **Transaction v1** | Replaces `sig_op_count` with per-input compute budgets; adds covenant output bindings (`authorizing_input`, `covenant_id`) |
| **Covenant IDs** (KIP-20) | Consensus-tracked lineage labels that survive the P2SH hash changing |
| **Introspection opcodes** (KIP-17) | Read inputs, outputs, covenant groups, auth groups, hashes, byte slices |
| **Script pricing** | Meters stack growth, hashing, signatures, ZK verification in "script units" |
| **ZK precompiles** | Verify Groth16 and RISC Zero proofs inline in script |
| **User lanes** (KIP-21) | App-specific L1 activity commitments for based apps |

## The core mechanic: compress, open, validate, recompress

State lives in the **redeem-script preimage of a UTXO**, not in an account:

1. The chain stores only `P2SH(hash(redeem_script))` — a compact commitment.
2. Spending reveals the redeem script, so the old state becomes readable as constants.
3. The script computes what the next state is allowed to be.
4. The script verifies the transaction creates an output committing to that updated state.

Because the P2SH hash changes on every transition, identity would be lost — which is what
**covenant IDs** solve: an output declares membership in a covenant, the UTXO carries the
same `covenant_id`, and consensus enforces that only authorised inputs can mint new UTXOs
into that family. That is the primitive we would use for "this listing is the same listing
it was yesterday."

State does **not** have to live in one UTXO. The docs explicitly encourage distributing it
across many independent lineages — "small protocol families" rather than one contract.
That framing matters enormously for us; see the mapping below.

## SilverScript — the authoring language

Writing raw covenant script means hand-assembling stack layouts, introspection opcodes and
P2SH reconstruction. SilverScript is the intended path: you declare state and transition
policy, the compiler generates the plumbing.

```
contract Vault(pubkey owner, int unlock_time, int init_amount) {
    int amount = init_amount;

    entrypoint function spend(sig owner_sig) {
        require(tx.time >= unlock_time);
        require(checkSig(owner_sig, owner));
    }
}
```

Introspection is exposed as objects rather than stack choreography:

```
require(tx.outputs[0].value == tx.inputs[this.activeInputIndex].value);
byte[32] cov_id = OpInputCovenantId(this.activeInputIndex);
int in_count = OpCovInputCount(cov_id);
```

`#[covenant(...)]` macros generate the transaction wrappers — *auth binding* (the active
input authorises successors via `OpAuthOutputIdx()`) and *cov binding* (transitions span
inputs/outputs sharing a covenant ID).

Toolchain: the `silverc` compiler, Rust compilation APIs, entrypoint ABI support, a
source-level debugger, and test fixtures. `cargo test -p silverscript-lang`,
`cargo run -p cli-debugger -- [file] --function [name]`.

Status per the docs: SilverScript is "approaching stable interface" and **Argent** (an
actor-style multi-contract frontend) is explicitly experimental. Plan around the first,
not the second.

## The limits that decide feasibility

Script pricing is a three-tier meter: `1 compute_budget = 100 compute grams = 10,000
script units (SU)`. Each input gets 9,999 SU free; `allowed_script_units = compute_budget
× 10,000 + 9,999`.

| Operation | Cost |
|---|---|
| SHA256 / Blake3 | 1 SU per byte |
| Blake2b | 2 SU per byte |
| Stack bytes pushed | 1 SU per byte |
| **Signature check** | **100,000 SU per attempt** |
| Groth16 proof | 14M SU + 250K × (public inputs + 1) |
| RISC Zero Succinct | 25M SU |

The signature cost dominates everything we would do: one `checkSig` alone needs
`compute_budget ≈ 10`. Their worked example — 1 signature + 2KB Blake3 + 1KB stack =
103,072 SU → budget 10 — is almost exactly the shape of a "verify the owner, then update
the listing" transition.

**Design consequence for us**: every byte of listing state is metered twice over (pushed
to stack, then hashed). Storing profile text, descriptions or many links directly in
covenant state gets expensive fast. Expect to store *hashes* on-chain with the payload
off-chain, or accept a hard cap on profile size.

## Two paths, and the criterion for choosing

The decision guide is refreshingly blunt: complexity is **not** the deciding factor.
**State layout is.** The question is "can the app be expressed as many parallel live UTXOs,
or does it need many users mutating one shared state object?"

- **L1 covenants** fit parallel, independent state: singleton covenants, fanout covenant
  families, token-like conservation across inputs/outputs. Kaspa's 10 BPS means partitioned
  state progresses independently across the DAG.
- **Based ZK apps** fit when many users mutate one shared state — at the cost of operators,
  a proving pipeline and settlement latency.
- **Inline ZK** is narrow: hidden state transitions, private predicates, proof of external
  state. Not a general escape hatch.

Their stated hierarchy: start with covenants → expand to covenant families → add inline ZK
for privacy → move to based apps only when shared state dominates.

**Design alarms** that mean covenants will hurt: every user competing for the same live
UTXO; correctness depending on the *global absence* of a UTXO; transaction construction
requiring you to discover and coordinate many state fragments.

## Mapping KaspaDomains onto this

Applying their own criterion to our four data types:

| Our data | Shape | Verdict |
|---|---|---|
| **Listings** | One per domain, independent, mutated only by its owner | ✅ **Ideal.** A fanout covenant family, one lineage per domain. This is the textbook case. |
| **Categories** | Membership of a listing | ✅ Fits as part of that listing's state — a small bitmap or ID set, cheap to meter. |
| **Resources / links** | Per-domain, owner-edited | ⚠️ Fits structurally, but see the metering note — store a hash on-chain, payload off-chain, or cap it hard. |
| **Votes** | **Many users mutating one domain's counter** | 🚩 **This is the design alarm, verbatim.** A single vote-count UTXO per domain is exactly "every user competing for the same live UTXO". |

**Voting is the only genuinely hard part**, and it has a known shape of answer: don't keep
a counter. Make each vote its own UTXO in the domain's covenant family — one lineage per
voter, tagged with the domain's covenant ID. Votes then never contend, "one vote per
wallet" becomes a property of the voter's own lineage rather than a global uniqueness
check, and the *count* is an indexer aggregation rather than on-chain state. That trades a
consensus-enforced counter for an indexed one, which is worth being explicit about: the
tally becomes as trustworthy as whoever indexes it, unless a periodic on-chain checkpoint
is added.

Note the ordering implication: our current "one vote per wallet" is enforced by a unique
constraint in Postgres. On L1 it has to be enforced structurally, and "prove this wallet
has not voted before" is close to the second design alarm (correctness depending on the
global absence of a UTXO). **Do not assume this is free — it is the first thing to
prototype.**

## A migration sketch (not a commitment)

Ordered so each phase is useful alone and none of it requires trusting the next:

1. **Prototype the listing covenant.** One domain, one lineage: create, transfer nothing,
   update categories, update a resource hash. Get it running on testnet with `silverc` and
   the CLI debugger. This alone answers most feasibility questions.
2. **Prototype voting as fanout.** The hard part — specifically the one-vote-per-wallet
   property. If this doesn't work cleanly, voting may stay off-chain permanently, and that
   is an acceptable outcome.
3. **Index it.** A reader that reconstructs listings and vote tallies from the DAG into the
   same `Domain` / `CategoryManifest` shapes `src/data/supabaseSource.ts` already returns.
   Our data layer picks a source at call time, so this slots in as a third source beside
   Supabase and the Kasplex contracts without touching any page.
4. **Dual-write, then cut over.** Write both for a period, compare, then flip the source of
   truth. `domains.tx_hash` already exists in the schema for exactly this reconciliation.
5. **Retire the Kasplex path** only once L1 is authoritative.

Step 3 is the reason the current architecture was built the way it was — the read layer
was deliberately kept source-agnostic.

## What must be verified before committing to this

Honest list of what we do not know:

- [ ] Whether KNS ownership can be checked *inside* a covenant, or only alongside it. Our
      entire ownership story depends on this and it is unconfirmed. KNS domains are L1
      inscriptions; a covenant reading them is plausible but unverified.
- [ ] Real cost per listing transition once state size is realistic. The signature alone is
      100K SU; add state and it may or may not stay comfortable.
- [ ] Whether "one vote per wallet" can be enforced without a global-absence proof.
- [ ] SilverScript's stability in practice — the docs say "approaching stable".
- [ ] Whether a 10,000-listing cap is expressible, or becomes an indexer-level rule.
- [ ] Who runs the indexer, and what the trust story is when tallies come from it.

## Links

Primary (start here):
- [Toccata Dev Guide](https://docs.kaspa.org/toccata) — the hub; progresses Covenant State → Transaction V1 → Script Pricing → SilverScript → Inline ZK → Based Apps
- [Covenant State](https://docs.kaspa.org/toccata/covenant-state) — the P2SH state pattern and covenant IDs
- [SilverScript](https://docs.kaspa.org/toccata/silverscript) — language guide, macros, patterns
- [Script Pricing](https://docs.kaspa.org/toccata/script-pricing) — the cost model above
- [Decision Guide](https://docs.kaspa.org/toccata/decision-guide) — covenants vs based apps

Specifications and background:
- [kaspanet/kips](https://github.com/kaspanet/kips) — KIP-10 (introspection), KIP-17 (opcode support), KIP-20 (covenant IDs), KIP-21 (user lanes)
- [Covenants++ "Toccata" Hard-Fork Outlook](https://medium.com/@michaelsuttonil/kaspa-covenants-toccata-hard-fork-outlook-a4d81a40900c) — Michael Sutton, protocol-level rationale
- [rusty-kaspa Toccata guide](https://github.com/kaspanet/rusty-kaspa/blob/master/docs/toccata-guide.md)
- [Kaspa developer resources](https://kaspa.org/build) — WASM SDK, Python SDK, Rust crates, node access

Tooling and ecosystem:
- [vProgs](https://vprogs.xyz/build/silverscript-reference/) — SilverScript reference and the Rust runtime for based computation
- [kascov.io](https://kascov.io/) — live covenant explorer, useful for seeing real covenant families in the wild
- [Kaspa FAQ: smart contracts](https://kaspafaq.com/faq/smart-contracts/)

## Related docs

- [`KASPA_DEVELOPMENT.md`](./KASPA_DEVELOPMENT.md) — the wider ecosystem picture (Kasplex,
  Igra, KRC-20, KNS) and why we are on Kasplex at all.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md#data-model) — the current Supabase-primary design
  this would eventually replace, including the source-agnostic read layer step 3 relies on.
- [`GAPS.md`](./GAPS.md) — the unproven-ownership gap that motivates this.
- [`BUGS.md`](./BUGS.md) — why the Kasplex contracts are not an option today.
