# Optimistic-concurrency checklist

**Purpose**: stop a valid request from replacing state the user never saw.

Last updated: 2026-09-06

Use this for any write that replaces a whole collection or object: profile links,
categories, preferences, document sections, or a complete JSON blob. It operationalizes
[`MIND.md` principle #21](../MIND.md#21-a-one-time-token-is-not-a-version-check).

## 1. Name the state being replaced

- [ ] Is this a bulk replace, delete-and-reinsert, or “set the complete list” API? If so,
  a stale UI can delete values it did not render even when every request is authenticated.
- [ ] List every route with that replacement shape. Do not fix the first one and leave its
  same-schema sibling vulnerable.

## 2. Couple the displayed data to a version

- [ ] Add a monotonic revision owned by the row that owns the profile, not a timestamp that
  unrelated writes can change.
- [ ] Return the revision in the **same database read** as the data rendered by the editor.
  Two reads can pair data from one point in time with a version from another.
- [ ] Keep the revision beside the draft in client state. If either the data or revision is
  unknown, lock the save control rather than guessing.

## 3. Make capabilities narrow and single-use

- [ ] If a nonce is needed, issue it only after the server authenticates and authorizes the
  caller. It must be bound to domain/row, action, verified signer, expected revision and a
  short expiry.
- [ ] Include nonce and revision in the final signed payload. Excluding either from the
  digest turns it into attacker-controlled metadata.
- [ ] Replayed issuance must return an existing live nonce; it must not invalidate a user's
  pending save. Expired entries can be replaced.
- [ ] Never mint a “current revision” only at Save. That proves freshness of the token, not
  freshness of the editor state.

## 4. Enforce it where the write is atomic

- [ ] In one transaction: lock the parent row, compare its revision with the expected one,
  consume the exact live nonce, perform the replacement, increment the revision and return
  it.
- [ ] Ensure every predicate is present on the nonce consumption: nonce, parent ID, action,
  verified signer, expected revision and expiry.
- [ ] Confirm a mutation failure rolls nonce consumption back. A retry should not be made
  impossible by a validation failure that changed nothing.
- [ ] Drop obsolete RPC overloads that lack the new arguments; a service-only caller using an
  old signature is still a bypass.

## 5. Make recovery honest and prove the races

- [ ] Return a distinct conflict for stale revision (“reload”) and used/expired token (“sign
  again”); do not claim a save failed generically after the database may have committed it.
- [ ] Test or integrate-test: reuse one nonce, use two nonces at one revision, submit a
  stale revision, and force a later mutation failure to prove the nonce survives rollback.
- [ ] Check the schema migration, runtime types, RPC permissions and readiness probe together.
  A new function hidden from anon must still be proved to exist with an admin call; otherwise
  a missing function and a safely revoked one look identical.

## Related

- [`../MIND.md`](../MIND.md#21-a-one-time-token-is-not-a-version-check) — the principle and
  the profile-editor incident that produced this checklist.
- [`shared-value-format-checklist.md`](./shared-value-format-checklist.md) — nonce and
  revision are shared values crossing client, API and database boundaries.
- [`health-check-checklist.md`](./health-check-checklist.md) — do not call a permission
  probe green if it cannot prove the function itself exists.
