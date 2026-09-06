# Mind — working checklists

**Purpose**: turn [`../MIND.md`](../MIND.md)'s narrative principles into steps you can
actually run, so "remember why this matters" becomes "here's what to do right now."

Last updated: 2026-09-06

`MIND.md` states the operating principles as narrative, each backed by a real incident,
now with an explicit Purpose/Mechanic line per principle. This directory is the
checklist layer underneath that: concrete steps, not just the lesson. Use `MIND.md` to
understand *why* a rule exists; use these when you're about to *do* the thing the rule is
about.

| File | Purpose | Backs principle(s) |
|---|---|---|
| [`verification-checklist.md`](./verification-checklist.md) | Confirm a technical/ecosystem claim against the real thing before trusting or writing it down | #1, #7, #10 |
| [`fallback-audit-checklist.md`](./fallback-audit-checklist.md) | Find fabricated-data fallbacks hiding in shared code, not just display components | #2 |
| [`shared-function-change-checklist.md`](./shared-function-change-checklist.md) | Stop a fix to a widely-called function from silently breaking (or silently not helping) callers nobody checked | #12 |
| [`testnet-mainnet-transitions.md`](./testnet-mainnet-transitions.md) | Judge how plausible "the testnet was reset" is, using real industry precedent | (context for `BUGS.md`) |
| [`health-check-checklist.md`](./health-check-checklist.md) | Stop a monitor reporting OK when it could not actually see anything | #14 |
| [`irreversible-action-checklist.md`](./irreversible-action-checklist.md) | Make sure every refusal is established before money moves, not after | #9, #16 |
| [`shared-value-format-checklist.md`](./shared-value-format-checklist.md) | Stop two sides of a boundary agreeing informally about a value's shape | #17 |
| [`optimistic-concurrency-checklist.md`](./optimistic-concurrency-checklist.md) | Prevent a valid save from replacing state the editor never rendered | #21 |

## Related docs

- [`../MIND.md`](../MIND.md) — the full principles these checklists operationalize.
- [`../BUGS.md`](../BUGS.md) — the incidents that produced this directory (the dead
  contracts, the MCOPY bug, the fabricated fallback manifest, the conflated catch block).
- [`../KASPA_DEVELOPMENT.md`](../KASPA_DEVELOPMENT.md) — the Kaspa-ecosystem research
  these checklists were applied to.
- [`../HISTORY.md`](../HISTORY.md) — the dated narrative these principles were extracted
  from.
- [`../TODO.md`](../TODO.md) — live index and backlog.

Told to **"expand your mind"**? That's a standing command on `MIND.md` itself, not this
index — see
[`../MIND.md`](../MIND.md#standing-command-expand-your-mind) for exactly what it means
and the steps it triggers.
