# Health-check checklist

**Purpose**: stop a monitor from reporting OK when what actually happened is that it could
not see anything.

Last updated: 2026-09-06

Run this when writing or changing anything that reports whether a system is working:
`/api/status`, `npm run db:check`, a CI gate, a "is this configured?" banner. Grew out of
[`MIND.md`](../MIND.md)'s principle #14, and the concrete 2026-09-06 incident where a
freshly-written `/api/status` reported **"All 6 tables present"** while every table was
missing — because it treated "not the one error I named" as success.

## 1. Enumerate three outcomes, not two

- [ ] For every individual check, write down what **pass**, **fail** and
  **could-not-determine** each look like. If you only have two, you have a bug.
- [ ] Confirm the third state is *reported*, not folded into either of the others. An
  unknown rendered as OK is the failure this checklist exists to prevent; an unknown
  rendered as a hard failure is merely annoying.

## 2. Only positive evidence counts as a pass

- [ ] Does the pass branch require something to have **succeeded**, or merely to have not
  produced one specific error?
- [ ] Rewrite any `if (error.code === X) fail; else pass` as:
  `if (!error) pass; else if (error.code === X) fail; else unknown`.
- [ ] For a check that asserts something is *refused* (RLS, auth, a rate limit), make sure
  the refusal came from the mechanism you are testing. A connection failure also produces
  an error, and reading that as "refused" means the check passes hardest when it can see
  least.

## 3. Make the aggregate honest

- [ ] Does the overall status go green when some checks are unknown? It must not — use a
  third overall state (`degraded`) so an unknown can never be mistaken for a pass.
- [ ] Does the HTTP status code match the report? A monitor reads the code, not the body.

## 4. Disagree with yourself on purpose

- [ ] Is there a **second, independent** implementation of this check — a script, a CLI, a
  different client? Run both.
- [ ] When they disagree, **the disagreement is the finding.** Do not pick the more
  convenient answer. In the 2026-09-06 incident, `npm run db:check` said every table was
  missing and `/api/status` said all six were present; the script was right, and the
  disagreement was the only reason the bug was caught the same hour it was written.

## 5. Test it against a broken system, not a working one

- [ ] Point it at a system you *know* is broken — wrong URL, missing key, un-applied
  schema — and confirm it says so. A health check has only ever been exercised in its
  useless direction until you do this.
- [ ] Check the failure text names something actionable. `Refused: .` sent me looking at
  RLS for what was really a failed TLS handshake; `TypeError: fetch failed` named nothing
  at all until the likely cause was spelled out.

## 6. Do not leak while reporting

- [ ] Report *whether* something is configured and reachable, never the value. No keys, no
  key prefixes, no connection strings.
- [ ] If a value must be shown (the treasury address is, because users pay to it), confirm
  it is already public by necessity.

## Related

- [`../MIND.md`](../MIND.md#14-a-check-that-cannot-see-must-report-unknown-never-ok) —
  principle #14 and the incident behind it.
- [`verification-checklist.md`](./verification-checklist.md) — the same instinct applied to
  claims about on-chain functionality rather than to monitors.
