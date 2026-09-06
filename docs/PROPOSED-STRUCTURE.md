# Proposed structure — organising the repo for agents

Last updated: 2026-09-06
**Status: proposal. Nothing here has been done. It needs an owner decision.**

A concrete plan for reorganising `src/` so that both humans and AI agents can change one
behaviour without reading six directories — and so that the mistakes this codebase actually
made become *impossible* rather than merely documented.

---

## 1. The argument, from this repo's own bugs

Not theory. Every one of these is from the last three days, and each has a structural cause:

| Bug | Structural cause |
|---|---|
| Header search never matched anything | `.kas` normalisation duplicated on both sides of a boundary, in files four directories apart |
| Fee shown 10¹⁰× too large | `Domain.feePaid` is sompi from one source and wei from another — one type, two producers, no owner |
| Withdrawing a category 404'd paid listings | The profile page used the category manifest to answer "does this domain exist", because it was the nearest available function |
| 18 dead files, invisible | Grouped by technical kind, so an orphan looks exactly like a live file |
| `/list-domain` promised a bio and image | Copy lives in `app/`, the feature it describes died in `hooks/` — nothing connects them |
| "4 of 6 contracts dead" wrong for two days | Contract config in `lib/`, its consumers scattered; no single place that says "these are all of them" |

The strongest evidence is [`kaspadomains-systems.md`](./kaspadomains-systems.md). I had to
*write a document* mapping systems to files. **If the directory layout matched the systems,
that document would be `ls`.** A map is what you need when the territory is badly organised.

### Why this matters more for an agent than for a person

A person builds a mental model once and keeps it for months. An agent starts every session
cold and rebuilds it from whatever it can read cheaply. So:

- **Locality is context budget.** One feature spread over `app/`, `components/`, `hooks/`,
  `lib/`, `data/`, `context/` costs six reads before any work starts, every session.
- **Convention is not enforcement.** "The service-role key must stay server-side" is a
  comment. An agent that has not read it will not honour it. A *path* it cannot import from
  is honoured by the build.
- **Proximity beats documentation.** A gotcha 300 lines away in `BUGS.md` gets missed; the
  same gotcha in the folder you already opened does not.

---

## 2. The proposed tree

```
src/
  app/                          # ROUTES ONLY — thin, delegate immediately
    (marketing)/                # home, learn, docs, about, terms, privacy
    (browse)/                   # domains, categories, search, top-voted
    (owner)/                    # list-domain, my-domains, my-votes, domain/update
    domain/[name]/
    api/                        # handlers that call into features/*/server
    status/

  features/
    identity/                   # who is this, and do they own the domain
      README.md                 # ← agent reads this first
      server/verify-request.ts
      client/use-wallet.ts, connect-button.tsx
      shared/signed-message.ts  # the format BOTH sides use — one owner
      types.ts

    payments/
      README.md
      server/verify-payment.ts, payment-intent.ts
      client/pay-fee.ts, preflight.ts
      shared/fees.ts, money.ts  # Sompi/Wei branded types live here
      types.ts

    listings/  voting/  categories/  profile-links/  discovery/
      (same shape: README, server/, client/, shared/, types.ts)

  platform/                     # cross-cutting infrastructure, no product logic
    supabase/                   # client, generated types, page helper
    kaspa/                      # KNS + L1 API clients
    kasplex/                    # EVM access (fallback only)
    security/                   # proxy/CSP, nonce
    observability/              # status checks, csp reports

  shared/                       # genuinely generic; imports nothing from features
    ui/                         # Loader, Toast, icons, layout primitives
    lib/                        # utils with no domain knowledge

  legacy/                       # quarantined, excluded from tsconfig `include`
    kasplex-contracts/          # the 8 addresses, ABIs, EcosystemAdmin, 18 dead files
      README.md                 # "6 of 8 have no deployed code. Do not build on this."
```

### The four rules that make it work

1. **`features/*/server/` is server-only.** Enforced by lint, not by comment. Nothing under
   `client/` may import from any `server/`.
2. **Features do not import each other's internals.** Cross-feature use goes through
   `features/x/index.ts` or, better, through `platform/`. Today `VotingSection` imports from
   `data/supabaseSource` directly; that becomes `features/voting`'s job.
3. **`shared/` and `platform/` never import from `features/`.** Dependencies point one way.
   A cycle here is what lets a bug in one system reach another.
4. **`legacy/` is out of `tsconfig`'s `include`.** Dead code stops compiling, stops being
   suggested by autocomplete, and stops looking alive.

### The per-feature `README.md` — the highest-value part

Six to fifteen lines an agent reads before touching anything:

```markdown
# payments
Charges 200 KAS to list, 1 KAS to vote, on Kaspa L1.

## Invariants — do not break these
- The wallet prompt is the LAST uncertain step. Preflight everything first.
- A receipt funds exactly one action, ever, enforced by the DB not by code.
- The payment must come FROM the signer, or a public txid is a bearer coupon.

## Gotchas
- feePaid is sompi here, wei on the contract path. Use the branded types.
- The intent is NOT a security boundary. Every check is re-run at write time.

## Before changing anything: docs/mind/irreversible-action-checklist.md
```

This is the same idea as `AGENTS.md`, scoped to a folder. It puts the invariant *where the
work happens* instead of 300 lines into a document nobody opened.

---

## 3. Encode the principles as lint rules

The layout is only half of it. Structure that is not enforced drifts back within weeks. Each
of these turns a `MIND.md` principle into something the build checks:

| Rule | Principle | Prevents |
|---|---|---|
| `eslint-plugin-boundaries` — no `client/` → `server/` imports | — | The service-role key reaching the browser |
| `no-restricted-imports`: `features/*/server/*` outside `app/api` and `features/*/server` | — | Server logic leaking into a page |
| Ban raw `BigInt`→string rendering of money; require the branded formatter | #17 | The 10¹⁰ fee bug |
| Ban `catch { return [] }` and `catch { return undefined }` in `data/` | #2, #11 | Outages rendering as "nothing found" |
| `knip` or `ts-prune` in CI | #18 | The next 18 dead files |
| Forbid `legacy/` imports from anywhere but `legacy/` | — | Building on dead contracts |

**Start here even if the move never happens.** `knip` alone would have found the dead files
months earlier, and it costs one dependency and one CI line.

---

## 4. Migration order — lowest risk first

Each step is independently valuable and independently revertable. Stop at any point.

| # | Step | Risk | Payoff |
|---|---|---|---|
| 1 | Add `knip` + the `no-restricted-imports` rules to CI | none | Catches dead code and boundary violations immediately |
| 2 | Add branded `Sompi`/`Wei` types in one file; fix `Domain.feePaid` | low | Kills a whole bug class (#17), no files move |
| 3 | Create `legacy/`, move the 18 dead files + `EcosystemAdmin` + contracts, exclude from `tsconfig` | low | −2,000 lines of live surface. **Needs your delete-or-keep decision** |
| 4 | Extract `platform/` (supabase, kaspa, kasplex, security) | medium | Infrastructure stops being mixed with product logic |
| 5 | Slice one feature end-to-end — **`payments` first**, it has the clearest boundary and the highest stakes | medium | Proves the pattern on the code that matters most |
| 6 | Slice the rest, one per session, updating `FILES.md` each time | medium | — |
| 7 | Thin `app/` to routes; add route groups | low | Routes become a table of contents |

**Do steps 1–3 regardless.** They are cheap, they are not really "reorganisation", and they
deliver most of the benefit. Steps 4–7 are the real refactor and should only start once the
schema is applied and the paid flow has been exercised once end to end — moving files around
a system nobody has ever run is how you get a bug you cannot attribute.

---

## 5. What I would *not* do

- **Not a `src/server` / `src/client` top-level split.** It separates by runtime, which is
  the axis you rarely change along. You would still read six folders to change voting.
- **Not one file per component.** `features/voting/client/` holding four related components
  is easier to load than four directories with an `index.ts` each.
- **Not barrel files everywhere.** This repo already has two (`hooks/domain/index.ts`,
  `hooks/domains/index.ts`) that nothing imports and that hid dead code from a naive grep.
  One barrel per feature, at its boundary, and only if something crosses it.
- **Not a big-bang move.** A single commit that relocates 128 files makes every future `git
  blame` useless and every review impossible.
- **Not before the schema is applied.** That is still the one blocker for everything.

---

## 6. Honest cost

- ~128 source files touched across steps 4–7; every import path changes.
- `git blame` and `git log --follow` get noisier. `--follow` handles pure renames well;
  rename-plus-edit in one commit is what breaks it, so **move and edit in separate commits**.
- Codex is working in the same repo. This needs agreement on `AGENTS.md` before step 4, or
  we will spend a day resolving conflicts across every file.
- Realistically: steps 1–3 in one session; 4–7 over several, one feature at a time.

**Biggest risk:** doing this instead of applying the schema. The reorganisation improves how
fast the *next* bug gets fixed; it does not make a single listing work. If only one thing
happens next, it should be `supabase/schema.sql`.

---

## Related

- [`kaspadomains-systems.md`](./kaspadomains-systems.md) — the systems this tree would make
  physical
- [`FILES.md`](./FILES.md) — current layout, and the 18 dead files
- [`MIND.md`](./MIND.md) — the principles §3 would turn into lint rules
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — how it works today
