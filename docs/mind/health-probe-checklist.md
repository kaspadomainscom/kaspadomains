# Health probe checklist

Use this when an operational endpoint checks permissions, schema, or write readiness.
The check must not create or alter user data while deciding whether the system is safe.

## 1. Identify side effects

- [ ] List every write, trigger, notification, and cache mutation in the probe.
- [ ] Confirm the endpoint can be called repeatedly by monitors and crawlers.
- [ ] Treat a successful probe write as production data, not disposable test state.

## 2. Make the probe non-persistable

- [ ] Prefer a read or a dedicated transaction/rollback boundary.
- [ ] If a write is unavoidable, use values guaranteed by the live schema to fail before
  persistence, and preserve the error that proves the policy boundary.
- [ ] Do not rely on cleanup after the write; crashes and concurrent requests can leave rows.

## 3. Verify outcomes

- [ ] Test blocked, open-policy, missing-schema, and transport-failure responses separately.
- [ ] Assert the open-policy path reports unsafe without adding or changing a row.
- [ ] Keep live database and migration verification separate from the deterministic unit test.

Related: [`../MIND.md`](../MIND.md#26-a-health-check-must-not-change-health).
