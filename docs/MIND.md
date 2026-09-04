# Mind

Last updated: 2026-09-05

How to think about working on this codebase — principles earned the hard way this session,
each backed by a real incident. Read this before making changes, especially anything that
touches a contract call or a hardcoded number.

## 1. Never trust a hardcoded value against a live contract — verify the ABI first

**The incident**: the entire community voting feature — the "Vote to this domain" button
on every domain page, the like counter, `/domains/my-votes` — called contract functions
that simply don't exist (`getDomainLikeCount` instead of the real `getDomainVoteCount`,
`likeDomain` instead of `voteDomainByHash`, a `DomainLiked` event instead of the real
`DomainVoted`). It had never worked, possibly since the day it was written. Nobody caught
it because the code *looked* plausible — the names were reasonable guesses, just wrong.

**The rule**: before writing or trusting any `readContract`/`writeContract` call, `grep`
the real ABI in `src/abis/*.json` for the function name. Don't infer it from a similarly-
named function elsewhere, don't assume the existing code got it right, don't assume a
"likes"-sounding name means "votes" was the same thing under a different label. See
[`SPEC.md`](./SPEC.md) for the verified table this produced.

## 2. Don't fabricate data — an empty/error state is always better than a fake one

**The incident**: the homepage's "Trending .kas Domains" section was a hardcoded array
of made-up domains with made-up vote counts. It looked complete and polished. It was
lying — clicking through would 404. Nobody could tell it was fake by looking at the
rendered page; you had to read the source.

**The rule**: if real data isn't available (RPC down, wallet disconnected, feature not
built yet), show a real "no data yet" / "unavailable" state — even if it looks less
finished. A placeholder that's honestly labeled as a placeholder is fine; a placeholder
dressed up as real content is a trust problem, not a design choice.

## 3. Loading and error states need to be visually distinguishable

**The incident**: `DomainLikeCount` used the literal string `'Loading...'` for both "still
fetching" and "fetch failed" — so a permanently broken feature looked identical to a slow
network. This is *why* the voting bug above went unnoticed for so long: the failure mode
was silent by construction.

**The rule**: track loading/success/error as distinct states, not as `null` overloaded to
mean two different things. If it can fail, it needs to be able to *say* it failed.

## 4. "We are not a marketplace" is a real constraint on copy and data shape, not just a line
   in `/docs`

**The incident**: `/domains` branded itself "kaspadomains Market" with a "Buy Now" button
backed by entirely fake price/status data (`Domain` has no such fields — they silently
defaulted). The structured data (`getDomainJsonLd()`) used schema.org's `Product`/`Offer`
vocabulary — the literal shape search engines and shopping aggregators use to detect
purchasable listings — on every single domain page. Both directly contradicted the
explicit, repeated "we don't sell domains" positioning elsewhere on the same site.

**The rule**: "not a marketplace" isn't just a sentence on `/docs` — it constrains what
schema.org types are legitimate to use, what UI copy ("Buy," "Sold," "For Sale") is
allowed anywhere, and what data models are appropriate. When adding a domain-related
feature, ask whether it implies a sale, not just whether it says "sale."

## 5. A plain-text grep is not a complete audit

**The incident**: a grep for `"Buy Now"` (with a literal space) missed the sitewide
header ticker's `Buy&nbsp;Now` — the exact same phrase, but split by an HTML entity
inside JSX source.

**The rule**: after a text-based grep pass, also check rendered output (via a running dev
server), not just source. Entities, string concatenation, and template literals all defeat
naive greps.

## 6. Check the full lint/build output, not just the tail

**The incident**: several iterations in a row reported "same pre-existing N errors,
nothing new" based on `npm run lint 2>&1 | tail -N`. When one iteration finally grepped
the full output, the real picture was different — more files were affected than the tail
had ever shown, and a genuinely new, fixable issue (`react-hooks/error-boundaries`) had
been hiding in the untruncated middle of the output the whole time.

**The rule**: `tail` is fine for a quick sanity check, but before making a claim like "same
count as before" or "nothing new," run a real `grep -c`/full-file diff. A stable total
count can hide a completely different set of files underneath it.

## 7. Verify framework/library claims against current docs, not memory

**The incidents**: the removal of `app/**/head.tsx` as a Next.js convention, the exact
migration path off `next lint` in Next 16, and Kasware's EIP-1193 EVM-signing support were
all confirmed against live documentation before being acted on — not assumed from training
data. In one case (the KCC-0020 request), the same discipline produced the opposite
result: research showed the requested change didn't apply to this codebase's architecture
at all, and the right move was to *not* act and instead document why.

**The rule**: for anything version- or ecosystem-specific (a framework's file conventions,
a wallet's provider API, a token standard's status), look it up. This entire fast-moving
ecosystem (Kaspa, Kasplex, Next.js 16, ethers v6) changes underneath what any training
data would say.

## 8. A blocked or impossible request is a finding to report, not a guess to make

**The incidents**: "change the listing price to 210 KAS" and "admin can change the price
at any time" both ran into the same hard fact — `DOMAIN_FEE` is a contract constant with
no setter, so the *real* price literally cannot change without a new contract deployment
(which needs Solidity source this repo doesn't have, real funds, and is irreversible).
Rather than silently doing a partial, misleading fix (change the display but not the
charge, or vice versa) or refusing outright, the actual constraint was explained, the
user made an informed call (display-only, for SEO), and the resulting mismatch was
tracked as an explicit, named risk rather than hidden.

**The rule**: when a request runs into a real technical or safety wall, say so plainly,
explain *why*, and let the human decide how to proceed with full information — don't
paper over the gap and don't just decline. Document whatever gets decided so the tradeoff
isn't silently forgotten later.

## 9. Money-moving and irreversible actions get flagged, not executed

Deploying a new contract, transferring funds, or anything that spends real KAS or is
permanent on-chain is out of scope for autonomous action in this repo, full stop —
regardless of how straightforward the code change would be. This applies even when asked
directly ("admin can change price at any time" → correctly identified as requiring a new
deployment → not attempted). Frontend/docs changes that only ever *read* from contracts
are fine to iterate on freely.

## 10. ABI-correct isn't the same as chain-correct — verify against the live RPC, not just the ABI file

**The incident**: this session's earlier fix to the voting feature (see #1) verified
function names against `src/abis/*.json` and shipped it as "Fixed" — a real improvement,
but never actually confirmed against the live chain. A later pass (2026-09-05) called
`eth_getCode` directly against the RPC the app itself uses and found `DomainVotesManager`
(along with `KaspaDomainsRegistry`, `DomainCategoriesStorage`, and `KDCToken`) has **no
deployed code at all** at its configured address — the ABI-correct fix was calling a
contract that doesn't exist. Separately, `DomainLinksStorage.updateLinks` — credited as a
real, working write in the same "Fixed" list — turned out to revert with
`invalid opcode: MCOPY` on every single call, an EVM-hardfork mismatch invisible from the
ABI or the TypeScript types. Both were fund-safety-relevant (`payable` functions), not
just cosmetic.

**The rule**: matching the ABI is necessary but not sufficient. Before calling something
"fixed" or "working" — especially anything `payable` or state-changing — check that the
target address actually has code (`eth_getCode`) and that a real `eth_call`/simulation
against the live RPC succeeds, not just that the TypeScript compiles and the function name
matches. A static, offline check (grep the ABI) catches wrong-name bugs; it cannot catch
wrong-address or wrong-EVM-version bugs, which need a live network round-trip.

## Related docs

- [`SPEC.md`](./SPEC.md) — the verified ground truth principle #1 depends on.
- [`BUGS.md`](./BUGS.md) — the incidents behind these principles, in full.
- [`GAPS.md`](./GAPS.md) — decisions flagged rather than guessed at (principle #8).
