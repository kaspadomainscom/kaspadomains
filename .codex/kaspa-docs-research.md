# Research record — Kaspa Toccata and programmability

## Pre-registration (2026-09-05)

- Question: What do the official Kaspa Toccata and programmability pages say that is materially relevant to the Kaspadomains application?
- H1: Toccata documents a test environment relevant to application testing. Falsifier: the official page does not identify a usable test environment or testnet purpose.
- H2: The programmability page documents an EVM-compatible smart-contract environment whose constraints may affect the app's contract integration. Falsifier: the official page does not describe EVM compatibility or contract execution constraints.
- Method D1 (confirmatory): retrieve and inspect the official Toccata page.
- Method D2 (confirmatory): retrieve and inspect the official programmability page.
- Stopping rule: both pages retrieved and material claims can be directly bound to them; no implementation changes will be made.

## Evidence log

- E1 (2026-09-05): official page retrieved through Kaspa Docs navigation, https://docs.kaspa.org/toccata. Decisive text: “Toccata makes Kaspa UTXOs expressive enough to carry real application state” and “It is active on mainnet as of June 30, 2026.” Supports H1 only in the sense that the Toccata stack is documented as mainnet-active, not as a separate test environment; H1 is rejected.
- E2 (2026-09-05): official page retrieved directly, https://docs.kaspa.org/programmability. Decisive text: “Kaspa programmability is not one model. It is a set of building blocks” and its decision guide routes concurrent shared state to Based Apps and non-concurrent state to Covenants. Supports the project-architecture assessment below; it does not describe an EVM-compatible environment, so H2 is rejected.

## Results

- D1 (confirmatory): complete. Toccata is a mainnet-active UTXO programmability stack, not a testing environment.
- D2 (confirmatory): complete. The current official model is UTXO-native covenants / Rust-based apps, rather than a universal EVM smart-contract model.

## Preliminary conclusion

For Kaspadomains, the documentation supports treating Toccata as a separate, future architecture path. **Architectural inference:** it is not evidenced as a drop-in repair for the project's existing Kasplex EVM contracts; a migration would likely require a deliberate redesign around either partitioned covenant UTXOs or a Based App.

## Independent verification

- V1 (2026-09-05): fresh independent review of E1–E2 and both official pages. Verdict: **partially-confirmed**. The mainnet-active, UTXO-native, and decision-guide claims are directly supported. The conclusion about compatibility with this project's Kasplex EVM contracts is not directly documented and is retained only as an explicitly labeled inference.

## Transfer-feasibility pre-registration (2026-09-05)

- Question: Can the documented Toccata covenant model keep a KaspaDomains listing covenant automatically synchronized with a KNS ownership transfer, rather than trusting a former owner's public key?
- H3: A covenant can inspect its own successor state and selected transaction outputs, but official Toccata documentation alone does not establish that it can verify the current ownership of an unrelated KNS asset. Prediction: docs describe transaction-local introspection, not a global KNS ownership lookup. Falsifier: official docs document an opcode or verified pattern that reads arbitrary historical/KNS ownership state.
- H4: The current off-chain route prevents a former KNS owner from editing after a completed, API-visible transfer. Prediction: each mutation re-reads owner data server-side before write. Falsifier: any mutation authorizes solely from stored submitter/owner data.
- Method T1 (confirmatory): review official Covenant State, Transaction V1, and Silverscript documentation.
- Method T2 (confirmatory): audit the current client signing and server-side write routes.
- Method T3 (confirmatory): independent review of T1 and T2 conclusions.
- Stopping rule: document the evidence-supported boundary and name the owner-level choice required before implementation. No code or contract changes will be made.

## Transfer-feasibility evidence log

- E3 (2026-09-05): `package-lock.json`, installed `kaspa-wasm` version `0.13.0`; relevant local verifier is `src/lib/server/verifyRequest.ts`. Establishes the local integration surface before interpreting protocol docs.
- E4 (2026-09-05): official Covenant State page, https://docs.kaspa.org/toccata/covenant-state. It documents state in the redeem-script preimage, successor-output validation, and transaction-local auth/covenant group introspection. Supports H3's transaction-local half.
- E5 (2026-09-05): official Transaction V1 page, https://docs.kaspa.org/toccata/transaction-v1. It documents outputs and covenant bindings in a v1 transaction; it does not document a global ownership lookup. Supports H3.
- E6 (2026-09-05): official Covenants page, https://docs.kaspa.org/programmability/covenants. It identifies transfer policy and asset-native state machines as suitable uses, while noting tooling is early. Supports feasibility of a deliberately designed transfer mechanism, not automatic KNS linkage.
- E7 (2026-09-05): KIP-17 primary specification, https://github.com/kaspanet/kips/blob/master/kip-0017.md. It specifies transaction-local access to input outpoint IDs, input/output script public keys, and transaction fields. This strengthens E4: a covenant can recognize a deliberately specified same-transaction shape, but does not establish a KNS ownership query.
- E8 (2026-09-05): local audit of `src/lib/server/verifyRequest.ts`, `src/lib/signedFetch.ts`, `src/app/api/domains/route.ts`, and `src/app/api/domains/[name]/links/route.ts`. `requireDomainOwner` verifies an L1 signature and fetches current KNS owner on each listing/links mutation; the link route does not gate on stored submitter. Supports H4, subject to KNS API visibility/lag and non-atomic timing.
- E9 (2026-09-05): independent protocol review. It confirms same-transaction coupling is documented but finds no KNS-specific asset/recipient transfer grammar or canonical ownership artifact in the official Toccata material.

## Transfer-feasibility results

- T1 (confirmatory): complete. H3 is confirmed as phrased: documented introspection is transaction-local. KIP-17 exposes outpoints and script public keys, so a covenant can constrain a known co-spend shape; the documents do not establish an authoritative way to identify and verify the current owner of this project's KNS domain artifact.
- T2 (confirmatory): complete. H4 is partially confirmed. Once `api.knsdomains.org` reports a new owner, the former owner is rejected before a links write and the new owner can edit/sync the existing listing. This is not atomic with the L1 transfer and cannot beat index/API lag.
- T3 (confirmatory): complete. Independent verdict: **partially-confirmed**. The technical boundary is supported; any safe atomic KNS-coupling design still requires a KNS transfer specification and test vectors.

## Transfer-feasibility conclusion

Do not begin covenant implementation until the owner chooses a transfer policy. The safest currently evidenced policy is: reconcile against live KNS ownership off-chain, freeze/suppress a stale covenant-backed listing after a detected transfer, and allow the new owner to establish a replacement listing. This keeps KNS as the authority but means the indexer participates in the active-listing decision. An atomic co-spend/rekey alternative is promising but **unproven** until KNS publishes the canonical transfer representation, recipient encoding, and adversarial test vectors.

## Related local finding

The present off-chain authentication has a separate integrity gap: the signed message does not bind `links` request content. The issue was recorded on the shared AGENTS board; no files were changed because they are another agent's in-flight shared auth/write-path work.

## Integrate-guide pre-registration (2026-09-05)

- Question: What does the official Kaspa Integrate guide establish that materially affects the project's current Kasware L1 signing, KNS lookups, and server-side `kaspa-wasm` verification?
- H5: The guide recommends direct wallet/RPC integration patterns but does not replace this application's domain-owner verification requirement. Falsifier: the guide documents an ownership-verification mechanism that makes the server-side KNS comparison unnecessary.
- H6: The guide's documented SDK/library guidance is compatible with retaining `kaspa-wasm` server-side for signature verification. Falsifier: it requires browser-only verification or a conflicting API/version.
- Method I1 (confirmatory): record installed versions and inspect local integration surfaces.
- Method I2 (confirmatory): retrieve and review https://docs.kaspa.org/integrate.
- Method I3 (confirmatory): independently review the documented claims against the local integration choices.
- Stopping rule: identify concrete compatibility implications, or report that the guide is too general to support a change. No implementation changes will be made.

## Integrate-guide evidence log

- E10 (2026-09-05): local `package-lock.json` reports `kaspa-wasm` 0.13.0, `viem` 2.31.7, `ethers` 6.14.4, and Next 16.3.4. `src/lib/signedFetch.ts` uses Kasware L1 `getPublicKey`/`signMessage`; `src/lib/server/verifyRequest.ts` uses server-side `kaspa-wasm`; `next.config.ts` externalizes it from the client bundle. Supports I1.
- E11 (2026-09-05): official Integrate guide, https://docs.kaspa.org/integrate. It is a high-level routing page for RPC, wallet flows, accepted transactions, payloads, and node operation; it does not document Kasware extension methods or KNS domain ownership.
- E12 (2026-09-05): official Wallet guide, https://docs.kaspa.org/integrate/wallet. It recommends the high-level Wallet API and says browser builds persist wallet data in `localStorage`/`IndexedDB`; this concerns application-managed wallets rather than the installed Kasware-extension bridge used here.
- E13 (2026-09-05): official Accepted Transactions guide, https://docs.kaspa.org/integrate/accepted-transactions. It documents durable checkpoints, confirmation buffers, reorg rollback, and `getVirtualChainFromBlockV2` for data-bearing transaction ingestion.
- E14 (2026-09-05): official Transaction Payload and Kaspa Node guides, https://docs.kaspa.org/integrate/transaction-payload and https://docs.kaspa.org/integrate/kaspa-node. Payloads have a practical maximum around 25 KB; a self-run integration backend needs UTXO indexing and wRPC listeners.

## Integrate-guide preliminary results

- I1 (confirmatory): complete. The app currently uses an extension-managed L1 key for signing and a server-side SDK only for verification; it does not manage local wallet secrets.
- I2 (confirmatory): complete. H5 is confirmed: the guide provides no substitute for the KNS owner comparison. Its Wallet API is a separate application-managed-wallet pattern, so it should not be introduced merely to replace Kasware. H6 is **inconclusive**: the guide does not describe the installed `kaspa-wasm` 0.13.0 API or Kasware's extension signing convention; it neither validates nor conflicts with the current server-only verifier.
- Architectural implication: if/when covenant indexing begins, design it as a persistent backend ingestion worker with checkpoints, confirmation lag, and reorg rollback—not as a browser fetch or a one-shot Next route. The payload guide supports using small commitments/application data, not treating payloads as a queryable database.

## Integrate-guide independent verification

- I3 (confirmatory): complete. Fresh review verdict: **partially-confirmed**. The indexing/node implications are directly supported. The guide does not cover the Kasware extension API, KNS ownership endpoint, custom signed HTTP format, or `kaspa-wasm` signature-convention compatibility, so it cannot validate those implementation choices.
