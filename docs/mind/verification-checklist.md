# Verification checklist

**Purpose**: stop a technical claim from being written down as fact before it's actually
been checked against the real, live thing it's a claim about.

Last updated: 2026-09-05

Run this before writing down — in a doc, a comment, or a "Fixed" changelog entry — any
claim that a piece of on-chain functionality works. Grew out of
[`MIND.md`](../MIND.md)'s principles #1 (verify the ABI), #7 (verify ecosystem claims
against current docs), and #10 (ABI-correct isn't chain-correct), plus the concrete
2026-09-05 session where all three were needed together to find that 4 of 6 contracts had
no deployed code and the other 2 failed every call with `invalid opcode: MCOPY`.

## 1. Does the function actually exist?

- [ ] Grep the real ABI JSON (`src/abis/*.json`), not a similarly-named function
  elsewhere, not what "sounds right."
- [ ] Check the parameter types and order exactly — a hash vs. a string, a `uint8` index
  vs. a `uint256`, are common mismatches.

## 2. Does the contract actually exist, right now, on the chain the app uses?

- [ ] Read the RPC URL out of the actual client config the app uses
  ([`viemChains.ts`](../../src/lib/viemChains.ts)/[`viemClient.ts`](../../src/lib/viemClient.ts)),
  not an assumed default.
- [ ] Call `eth_getCode` directly against that address on that RPC. Empty (`0x`) means no
  contract — full stop, nothing else matters until that's fixed.
- [ ] If you want extra confidence it's not a transient RPC hiccup, check `eth_getCode` at
  `earliest` too, and the address's `eth_getTransactionCount` (nonce). Consistently empty
  across all of those is a real "never deployed here" signal, not a fluke.

## 3. Does calling it actually succeed?

- [ ] Make a real `eth_call` (raw JSON-RPC, or `viem`'s `readContract`/`simulateContract`)
  against the live RPC — not just a `tsc` type-check, not just "the ABI matches." A
  TypeScript compile only proves the *shapes* line up, never that the call succeeds.
- [ ] Test more than one function if the contract takes dynamic types (`string`,
  arrays, structs) — a single working zero-argument getter (e.g. a `MAX_X()` constant)
  does **not** prove functions with dynamic parameters/returns work; codegen for those can
  fail independently (this is exactly how the MCOPY bug was fully scoped — `MAX_LINKS()`
  worked, everything else on the same contract didn't).
- [ ] For a write path, `eth_call`-simulating it (no real transaction, no signer, no real
  value) works fine to check "does this revert" without spending anything or needing a
  wallet.

## 4. Is the ecosystem-level claim still current?

- [ ] For anything version- or ecosystem-specific — a hardfork's status, which EVM version
  a chain targets, whether a feature has shipped — search current sources, don't rely on
  training-data memory. Note the date you checked; fast-moving ecosystems make "current"
  claims stale within months.
- [ ] Prefer the project's own docs (e.g. `kaspa.org`, a chain's own network-info page)
  over secondary blog/news summaries where the two might disagree. Cross-check
  secondary sources against each other before trusting a single one — crypto churnalism
  varies wildly in accuracy.

## 5. If you're about to call something "Fixed"

- [ ] Have you done step 3 (a real call succeeded), or only step 1 (the ABI matches)?
  These are not the same claim. "Fixed the function name" and "confirmed this works
  on-chain" are both true statements to make — just don't let the first one get written up
  as the second.
