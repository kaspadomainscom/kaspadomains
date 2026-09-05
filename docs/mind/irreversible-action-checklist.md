# Irreversible-action checklist

**Purpose**: make sure every way a request can be refused is established *before* anything
irreversible happens, so a failure costs the user an error message and not their money.

Last updated: 2026-09-06

Run this whenever a flow moves funds, signs a transaction, sends something outward, or
deletes something. Grew out of [`MIND.md`](../MIND.md)'s principles #9 and #16, and the
2026-09-06 fix for Codex's SA-04 — where the browser asked for 200 KAS and only afterwards
discovered whether the server could do anything with it.

## 1. Find the irreversible step

- [ ] Name it precisely. In this codebase it is `payFee` in
  [`signedFetch.ts`](../../src/lib/signedFetch.ts) — the one function that moves real KAS.
- [ ] Confirm it is genuinely irreversible. A Kaspa transaction is; a database insert you
  can delete is not.

## 2. List every refusal, then check which side of the line it is on

- [ ] Write out **every** reason the request can still fail after that step: ownership,
  duplicate state, target existence, validation, quota, **and configuration**.
- [ ] For each one, ask: does this run before or after the irreversible step? Everything in
  the "after" column is something the user can pay for and not receive.
- [ ] Move all of them before it. If one genuinely cannot move, say so in the user-facing
  copy rather than implying a guarantee that does not exist.

## 3. Watch for the two sides deciding separately

This is the subtle one, and it is what actually caused SA-04.

- [ ] Does the **client** decide to take this path using different information than the
  **server** uses to accept it? Here the client checked the *public* Supabase key and the
  server needed the *server-only* one — so a deployment with the first and not the second
  charged users and answered 503.
- [ ] Grep for the pair. Any `isXConfigured` in client code whose server counterpart is
  `isXWritable` (or similar) is this bug waiting to happen.

## 4. Quote the price from the server, not the client

- [ ] Does the client pay an amount **the server just quoted**, or its own constant? If the
  two ever drift, only the server's number is the one verification will use.

## 5. Keep the preflight a convenience, not a boundary

- [ ] Confirm every check is **still re-run** at the point of the real write. A preflight
  that becomes load-bearing is a second authorisation path, and now you have two.
- [ ] Sanity test: if the preflight and its token were deleted entirely, would anything
  become forgeable? The answer must be no — users would only go back to paying before
  finding out.

## 6. Never retry an irreversible step

- [ ] No retry loop, no automatic re-submit, no "attempt 2 of 3". A retry that succeeds the
  second time may have succeeded the first.
- [ ] Once a transaction id exists, treat the action as done even if the surrounding request
  failed — see the receipt-release path in
  [`claimReceipt.ts`](../../src/lib/server/claimReceipt.ts), which returns a payment for
  re-use rather than replaying it.

## 7. Ask before doing it, in this repo's own terms

- [ ] Per principle #9: an agent working on this codebase **does not execute** money-moving
  actions. Building and verifying the code path is the job; pressing the button is the
  owner's.

## Related

- [`../MIND.md`](../MIND.md#16-put-the-irreversible-step-last) — principle #16 and the
  SA-04 incident.
- [`../SPEC.md`](../SPEC.md) — the paid write order, drawn out as a diagram.
- [`../BUGS.md`](../BUGS.md) — the receipt findings (SA-02, SA-03) that share this area.
