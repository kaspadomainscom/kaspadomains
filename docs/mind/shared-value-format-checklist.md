# Shared-value format checklist

**Purpose**: stop two sides of a boundary from agreeing informally about a value's shape,
because that agreement is invisible to the compiler and its violation is invisible at
runtime.

Last updated: 2026-09-06

Run this when a value is produced in one place and consumed in another: an identifier, an
amount, a timestamp, an address, an enum encoded as a string. Grew out of
[`MIND.md`](../MIND.md)'s principle #17 and two 2026-09-06 incidents that had both shipped
and neither of which produced an error — a header search that could never match, and a fee
displayed 10,000,000,000× too large.

## 1. Name the format, then name its owner

- [ ] Write the canonical form down in one sentence. "Lowercase, trimmed, always ending
  `.kas`." "Sompi, as a decimal string."
- [ ] **Who owns it?** There must be exactly one function or type that defines it. If the
  answer is "everyone knows", you have found the bug.
- [ ] Does every producer and every consumer go through that owner? Grep for the raw
  operation (`.slice`, `.replace`, `endsWith`, a bare division) — each hit is a place doing
  it by hand.

## 2. Prefer a type over a comment

- [ ] Can the format live *in the type* rather than in prose? `{ amount: bigint; unit:
  'sompi' | 'wei' }` turns a mismatch into a compile error. `feePaid: string` with a comment
  saying "sompi" turns it into a rendering.
- [ ] If the type cannot carry it, can normalisation move *inside* the shared function so a
  caller cannot get it wrong? `lookupDomain` normalises internally now, for exactly this
  reason.

## 3. Ask how a mismatch would show itself

This is the question that matters most, because the answer is usually "it wouldn't".

- [ ] Would a wrong-format value **throw**? Or would it silently mean something else?
- [ ] Equality on a wrong-form identifier returns *not found* — which is a plausible answer,
  not an error.
- [ ] A number in the wrong unit still renders, still sorts, still compares.
- [ ] A timestamp in the wrong epoch still formats as a date.
- [ ] If a mismatch is silent, that alone justifies moving it into the type.

## 4. Look for the mirror image

- [ ] An implicit agreement is usually implicit in **both** directions. Having found the
  consumer that strips a suffix, check the producer that adds one.
- [ ] After fixing it, would the *opposite* mistake now be possible? Formatting every fee as
  sompi would have been exactly as wrong on the contract path as printing it raw was on the
  Supabase path.

## 5. Check every crossing, not just the one you found

- [ ] List every place the value crosses a boundary: API body, database column, URL segment,
  wallet call, log line, structured data.
- [ ] The same value can be canonical in one and not another — a URL segment may need the
  suffix stripped for display while the lookup needs it present. That is fine, as long as
  one function makes each conversion.

## 6. Write the cross-reference

- [ ] Put a comment on each side naming the other, so the next person changing one finds the
  other. `normalizeDomainName` and `normalizeDomain` each point at the other and say that
  drifting apart fails silently.

## Related

- [`../MIND.md`](../MIND.md#17-a-value-that-crosses-a-boundary-needs-one-owner-of-its-format)
  — the principle and both incidents.
- [`shared-function-change-checklist.md`](./shared-function-change-checklist.md) — for when
  you change the owner rather than discover it.
