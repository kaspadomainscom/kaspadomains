# Testnet → mainnet transitions: what a reset typically looks like

**Purpose**: judge how plausible "the testnet was reset" is as an explanation, using real
industry precedent instead of a guess.

Last updated: 2026-09-05

Context for the still-open question in [`BUGS.md`](../BUGS.md): why do 4 of 6 contract
addresses in `contracts.ts` have no deployed code on Kasplex testnet, while 2 do? The
leading hypothesis is a testnet reset/redeploy where only some addresses in this repo
were ever updated afterward. This note isn't evidence about Kasplex specifically — it's
industry context for how plausible that hypothesis is, and what to ask about.

## Why projects reset testnets before mainnet

A full testnet data wipe ahead of a mainnet launch is a common, unremarkable pattern —
not a red flag on its own. Reasons projects typically give:
- Clearing accumulated test-only state (fake balances, spam transactions, stale contract
  versions) so the mainnet launch starts from a clean baseline.
- Shipping a final round of protocol/interface changes that aren't backward-compatible
  with earlier testnet deployments.
- "Fairness" resets — wiping leaderboards/reward-tracking state so no one carries an
  advantage from testnet-only activity into the real launch.

**Illustrative example (unrelated project, cited narrowly for the pattern, not as
evidence about Kaspa):** a 2026-07-29 testnet reset by Hertzflow (a DeFi protocol
unrelated to Kaspa) wiped all user transaction records, vault deposits, and pool shares
ahead of its mainnet launch, explicitly framed as clearing the way for a "fairer"
post-reset state. Source (a Binance Square community post, not a primary/official
source — treat accordingly):
[Binance Square post on Hertzflow's testnet reset](https://www.binance.com/en-AE/square/post/351411645711842).
The relevance here is narrow: it's one concrete data point that "wipe testnet state
before mainnet, without necessarily communicating exactly what changed to every
integrator" is a real thing projects do, not proof of what happened to Kasplex.

## What this means for the open question in BUGS.md

- A reset is a plausible, unremarkable explanation for 4 stale addresses — it doesn't
  need a more exotic explanation (an attack, a typo repeated 4 times, etc.) to make sense.
- It also means the fix is likely straightforward *if* current addresses can be obtained
  (check Kasplex's own testnet documentation/explorer, or whoever originally deployed
  these contracts) — not necessarily a sign the project itself is abandoned or broken.
- It's still worth confirming directly rather than assuming: check
  `https://frontend.kasplextest.xyz` (the block explorer) for the addresses in
  `contracts.ts` to see if they show any history at all, and check whether Kasplex or the
  original deployer announced a testnet reset around the time these addresses stopped
  resolving.

## Related docs

- [`../BUGS.md`](../BUGS.md) — the specific dead-address finding this note supports.
- [`../KASPA_DEVELOPMENT.md`](../KASPA_DEVELOPMENT.md) — Kasplex's actual mainnet launch
  timeline (public testnet May 2025, mainnet ~September 2025) — the kind of primary-source
  timeline this repo's own testnet reset should eventually be pinned against too.
