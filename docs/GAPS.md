# Gaps

Last updated: 2026-09-06

Things that are **missing or incomplete** — as opposed to things that are broken (see
[`BUGS.md`](./BUGS.md)). A gap is "never built" or "half-built and needs a decision";
a bug is "built, but doesn't do what it claims to." See [`TODO.md`](./TODO.md) for the
live backlog the continuous audit loop appends to.

## Missing pages / content

- [x] ~~**No Terms of Service, Privacy Policy, or About page.**~~ **Built 2026-09-05**, at
      `/terms`, `/privacy` and `/about`, and linked from the footer and sitemap. Written
      from the source — the schema, the API routes, the CSP — rather than from a template,
      so every claim is checkable against the repo; fees are read from `lib/fees.ts` rather
      than typed in, so the page cannot state a price the software does not charge.
      **Still open, and deliberately so:** they are marked "not reviewed by a lawyer", and
      are silent on **refunds**, the **operating entity** and the **governing
      jurisdiction**. Those are owner decisions; inventing a position on refunds for a
      site taking 200 KAS would be worse than admitting none exists yet.
- [ ] **No proper Open Graph banner image.** `public/og-image.png` is the square logo
      renamed (1024×1024), not a real 1200×630 branded banner — every social share (X,
      Discord, etc.) shows a squished/cropped logo. Needs an actual design asset; not
      something fixable from code.
- [ ] **No bio, title, image or website on a profile.** A listing shows its category,
      status, vote count and links — nothing else. This used to be blocked on
      `DomainDataStorage`, a contract that failed every call; with the contract path removed
      it is now simply an unbuilt feature, and a straightforward one: columns on `domains`,
      fields on the existing owner-only edit route. Needs a product decision on which fields
      are wanted, and a moderation answer for user-supplied image URLs.

## Data-shape gaps

- [x] ~~**Empty-for-unknown in the data layer.**~~ **Now a lint error** (2026-09-06). Found
      and fixed in seven places — the vote count, the voter list, the resources editor (where
      it let a save delete every link an owner had), the categories index, the browse page,
      the profile lookup and the admin owner check. Same shape each time: `[]` and `{}` mean
      "there are none", a failed read means "we don't know", and collapsing them turns an
      outage into a confident false statement. Documenting it as `MIND.md` #2 did not stop it
      recurring, so `eslint.config.mjs` now rejects `return []` / `return {}` from a `catch`
      in `src/data` and `src/lib`. Scoped rather than global because pages legitimately
      degrade — `generateStaticParams` returning `[]` is correct. *Verified in both
      directions*: the rule fires on a deliberate probe and the current tree is clean.


- [x] ~~**`Domain.feePaid` does not carry its unit.**~~ **Resolved 2026-09-06** by removing
      the second producer. There is one source and one unit now (sompi), so the ambiguity
      that made every card render the fee 10^10 too large cannot recur. Kept below as the
      original description, because the *shape* of the problem is worth remembering — a
      field whose meaning depends on who produced it — and the next multi-source field will
      have it again.
      <br>Original: It is a raw integer string whose meaning
      depends on which store produced the record: Supabase writes **sompi** (8 decimals), the
      contracts return **wei** (18 decimals). Those differ by 10^10, so a component that
      guesses wrong is not slightly off — it is wrong by ten orders of magnitude, which is
      exactly what `DomainCard` did (a 200 KAS listing rendered as "20000000000 KAS").
      Every consumer currently has to know which path it is on. The type should carry the
      unit — `{ amount: bigint; unit: 'sompi' | 'wei' }`, or normalise to sompi at the
      source boundary in `rowToDomain` / the contract mappers. Not done blind because it
      touches `src/data/types.ts`, which both read paths and every card depend on.

## Automated test coverage

- [~] **The repo has a small native test suite, not broad behavioral coverage.** `npm test`
      uses `node:test` with no additional runner, and CI runs it with lint and build. The
      current nine tests cover silent wallet restoration, domain-name canonicalization, the
      KNS-runtime boundary, and profile-write action/revision parsing. The important missing
      cases are still `fetchAllPages` at server caps above and below the page size,
      `paymentIntent` accept/reject properties, signed-message digest behavior,
      `verifyPayment` payer matching, and a database-backed race test for the profile-write
      token/revision transaction. The last of those cannot be meaningful until the Supabase
      schema exists somewhere to run it against.

## Supabase write-path gaps

- [x] ~~**No category-update route.**~~ **Built 2026-09-05.**
      `PUT /api/domains/[name]/categories`, owner-only, no fee, max 6, every key checked
      against `is_allowed`. Two decisions that were the reason it stayed unbuilt, now made:
      it **refuses an empty set** (categories are the only navigation, so a listing with
      none is invisible while still having been paid for), and it is **free** (the listing
      was already paid for; charging to fix a category just leaves listings
      miscategorised). Editable from the domain's update page.
- [x] ~~**No one-time nonce or profile revision on signed requests**~~ (Codex SA-05).
      **Code-level fix completed 2026-09-06.** Both bulk replacements now load their data
      with a monotonic `profile_revision`; the owner signs for a five-minute token bound to
      the domain, action, verified signer and that rendered revision; and the replacement
      RPC locks, compares, consumes and increments in one transaction. `KD006` tells an
      owner to sign again after a used/expired token; `KD007` tells a stale tab to reload.
      The migration and schema snapshot also remove the old nonce-free RPC overloads. This
      remains unavailable — deliberately with a 503 rather than a false success — until the
      never-applied Supabase schema is deployed, and no real wallet/database run has yet
      exercised it.
- [x] ~~**The user pays before the server has agreed to fulfil the action**~~ (Codex SA-04).
      **Fixed 2026-09-06.** `POST /api/domains/preflight` — signed, free — now runs
      write-readiness, KNS ownership, target existence, duplicate state and the category
      allow-list, and issues a short-lived HMAC payment intent bound to the action, domain,
      signer and amount. Both paid routes require it, so the order cannot be skipped, and
      the client pays the server's quote rather than its own constant. See `BUGS.md` for
      the verification evidence.
      **Since SA-08 also landed**, the remaining window is genuinely small: the payment and
      the write are separate operations, so a client that pays and then loses its connection
      before posting still ends up paid-but-unlisted. The receipt is unclaimed in that case,
      so **retrying with the same transaction id works** — but only if the user comes back.
      **Refund policy remains an unmade owner decision** (see `/terms`).
- [x] ~~**Listing and link replacement are multi-step, not transactional**~~ (Codex SA-08).
      **Fixed 2026-09-06** via `security definer` Postgres functions — see `BUGS.md` for the
      detail and for the permission trap the fix had to avoid. This does move real logic
      into SQL, which is a change in where the app's rules live; it was done because there
      is nowhere else the guarantee can exist, not because SQL was preferred. The rules that
      moved are narrow and mechanical (allow-list membership, receipt uniqueness, insert
      ordering); authorisation stayed in the routes.

## Supabase migration — reads and writes done, four real gaps left

Supabase became the primary store on 2026-09-05 by owner decision, and on 2026-09-06 it
became the **only** store — the contract fallback was deleted (see
[`ARCHITECTURE.md`](./ARCHITECTURE.md#data-model) and the API table in
[`SPEC.md`](./SPEC.md)). Listing, voting, categories and resources all read and write
Postgres behind signed requests; without a database the site cannot serve listings at all,
and `/status` says so. What's genuinely outstanding:

- [x] ~~**Nothing collects money any more**~~ — **fees restored 2026-09-05** at the
      owner's chosen rates: **200 KAS to list, 1 KAS per vote**. Paid on Kaspa L1 to a
      treasury address via `kasware.sendKaspa`, and verified server-side from the
      transaction id ([`verifyPayment.ts`](../src/lib/server/verifyPayment.ts)): the
      transaction must be accepted, and outputs to the treasury must total at least the
      required amount. Design points worth keeping:
      - **Payment is checked after ownership**, so a non-owner is never asked to pay for a
        listing they could not have created.
      - **The txid is consumed only if the row is written.** A failed insert leaves the
        payment reusable rather than burning someone's 200 KAS.
      - **Single-use is enforced by a unique constraint** on `payment_tx_id`, not by
        application code — only the database can decide that atomically when two requests
        quote the same payment at once.
      - **Overpayment is accepted**, never rejected: refusing it would mean taking the
        money and giving nothing back.
      - **No treasury address configured means paid actions are disabled, not free.**
      Still unproven: no payment has been made or verified against a real wallet.
- [x] ~~**L1 ownership is not cryptographically proven**~~ — **closed 2026-09-05.** The
      write path now signs with the **Kaspa L1 key**, not the Kasplex EVM key, and the
      server verifies it with the rusty-kaspa WASM SDK (`kaspa-wasm`): the signature is
      checked, the `kaspa:` address is derived from the signing public key, and that
      address must equal the owner KNS reports. Only the domain's owner can list it or
      edit it, re-checked against KNS on every request rather than trusting whoever listed
      it first — so a domain that changes hands becomes editable by its new owner and stops
      being editable by the old one. Rows now carry `ownership_verified = true`.
      Verified empirically before adopting the library (sign/verify round-trip, address
      derivation, tampered message and wrong key both rejected) rather than assumed.
      **Residual risk**: Kasware's message-signing convention is assumed to match the
      SDK's and is untested against a real extension. If it differs, verification **fails
      closed** — owners are rejected rather than impostors admitted. Do not "fix" such a
      failure by relaxing the check.
- [x] ~~**Site copy still describes the on-chain product.**~~ Swept repeatedly through
      2026-09-06 and again after the contract removal: the homepage, `/domains`, `/learn`,
      `/docs`, `/about`, `/privacy`, `/business-plan` and `/list-domain` all describe what
      the software actually does. `/docs` had been the worst — it documented KNS contract
      calls that were never made and stated the edit-permission rule backwards. The two
      remaining false claims are in Codex's status files; see `BUGS.md`.
      <br>Original: `/docs`, the homepage's
      single-payment permanence claims and "210 KAS", and `/business-plan` all
      promise permanence, on-chain recording and a fee. None of that is what happens now.
      This is user-facing and shouldn't sit unresolved — see the notice at the top of
      [`BUSINESS_PLAN.md`](./BUSINESS_PLAN.md).
- [ ] **Nothing has been run against a real Supabase project.** Everything is verified by
      type-check, lint and build only; no query, insert or RLS policy has executed. The
      schema and endpoints should be treated as unproven until someone provisions a
      project and exercises them (see `MIND.md` principle #10 — this is exactly the
      ABI-correct-but-chain-wrong shape of mistake, one layer over).
- [x] ~~**Reconciliation plan for when the contracts come back.**~~ Moot: the contract path
      was removed on 2026-09-06 and there is nothing to reconcile with. `domains.tx_hash` is
      retained for a future on-chain mirror (Toccata covenants), not for Kasplex.
      <br>Original: `domains.tx_hash` and
      `votes.tx_hash` exist for this, but nothing populates or reads them yet. Decide
      whether the database becomes a cache of chain state, stays authoritative, or the two
      are merged — before there's enough data for the answer to be painful.
- [ ] **No backups or migration tooling.** The schema is a single `schema.sql` applied by
      hand. Fine for now; not fine once real listings exist.

## Incomplete / half-built code

All three items previously tracked here were resolved on 2026-09-05 — the decide-or-delete
calls were made, consistently, in favour of never letting a placeholder flow look real:

- **`src/components/DomainForm.tsx`** — was disconnected from the real listing flow
  (`alert('Form submitted...')` over placeholder wallet/contract data). Now a small
  deprecated compatibility component that collects nothing, submits nothing, and links to
  `/list-domain` instead.
- **`src/app/domains/new-listings/page.tsx`** — was completely non-functional
  (`CONTRACT_ADDRESS` was the literal string `'0xYourContractAddressHere'`, a hardcoded
  999 KAS fee, and a `listDomain` call whose argument shape didn't match the real
  signature). Now a 12-line redirect to `/list-domain`, deliberately *not* forwarding a
  `name` query parameter, since the real flow derives available domains from the connected
  wallet rather than accepting arbitrary input.
- **`src/components/CustomizeDomainForm.tsx`** — deleted. The entire 98-line file was
  commented out, so it exported nothing and was imported nowhere (unlike `DomainForm.tsx`,
  there was no reachable entry point needing a compatibility shim). It also described an
  off-chain `/api/domains/[domain]/customize` endpoint that has never existed and which
  contradicts the on-chain-only data model — the on-chain home for tagline/bio is
  `DomainDataStorage`, still unwired and still blocked by the MCOPY bug (see `BUGS.md`).

## Dead code (confirmed unused, safe to delete)

Everything previously listed here has been deleted (2026-09-05), after re-confirming via
precise import-statement greps (not just a directory-name substring match) that nothing
outside each file's own directory imported it, and that no barrel/`index.ts` re-exported
any of them:

- **`src/hooks/likes/*`** (5 files) — an entire unused hook directory that also called the
  same wrong/nonexistent `DomainVotesManager` function names the real voting code used to
  (see `BUGS.md`).
- **`src/hooks/solidity/*`** (5 files) — turned out to be the *entire* directory, not just
  the 2 files (`useRegisterDomain.ts`, `useKaspaDomainsRegistry.ts`) originally flagged
  here; `useDomainLikes.ts`, `useMyVotes.ts`, and `useNewListings.ts` in that same
  directory were confirmed unused too.
- **`src/data/categories/*.ts`** (16 files, not 14 as originally counted here) — the real
  category system is fully on-chain via `DomainCategoriesStorage`
  (`categoriesManifest.ts`).
- **`src/types/db.ts`** — its `Domain` interface had `price`/`seller_telegram`/
  `kaspa_link`/`listed` fields (the marketplace shape `/domains` used to fake, separately
  fixed) and a commented-out earlier CSP draft referencing `https://supabase.com` — likely
  the origin of the still-open "why does live `proxy.ts` allowlist Supabase" question
  below. That question is still open even though this file is gone; this just explains
  where the string probably came from.

Verified with a real `npm run build` (exit 0) and `tsc --noEmit` after deletion, not just
a grep.

## Future feature specs (things explicitly requested, not achievable today)

- [ ] **Admin-adjustable listing fee.** Requested: "admin can change domain price listing
      at any time." Not possible with the deployed `KaspaDomainsRegistry` — `DOMAIN_FEE`
      is a `view`-only constant with no setter anywhere in the ABI (unlike
      `DomainVotesManager`, which has real `voteFee` + `setVoteFee`). What it would take:
      1. A new contract version with `setDomainFee(uint256)` (owner-only), mirroring
         `setVoteFee` — needs real Solidity source (not in this repo) and a security
         review before deployment.
      2. Deploy it, then update [`src/lib/contracts.ts`](../src/lib/contracts.ts) to the
         new address.
      3. Add an admin control for it in `/EcosystemAdmin`.
      4. No further frontend work needed beyond that — `useListDomain.ts` already reads
         `DOMAIN_FEE()` live at submit time rather than hardcoding it, so it'll pick up
         whatever the contract says automatically.

## Infrastructure / process

- [x] ~~No CI workflow~~ — added 2026-09-05 (`.github/workflows/ci.yml`): runs
      `npm ci`, `npm run lint`, and `npm run build` on every push and pull request.
      Committed and pushed 2026-09-05, after the type/lint errors on `main` were fixed, so
      its first run starts green rather than immediately red.
      Coverage is better than it looks: `next.config.ts` sets no
      `typescript.ignoreBuildErrors` override, so `next build` type-checks too — lint,
      types, and build are all gated. Still not covered: there are no tests to run (see
      the next item), so CI can prove the app compiles and lints, not that it behaves.
- [~] Test coverage is one file (Codex's, 2026-09-06). `src/test/a.tsx` — the empty placeholder — is deleted. At minimum, the
      contract-interaction hooks (`useListDomain`, wallet hooks) move real KAS value and
      are the highest-risk code paths to leave untested.
- [x] ~~No Kasplex **mainnet** chain definition~~ — moot, the EVM path is gone. Was: only `kasplexTestnet` existed in
      [`src/lib/viemChains.ts`](../src/lib/viemChains.ts). Note: Kasplex mainnet is a real,
      live network now (launched ~September 2025) with published endpoints
      (`evmrpc.kasplex.org` / `explorer.kasplex.org`) — this is no longer a "doesn't exist
      yet" gap, just an unadded config. See [`KASPA_DEVELOPMENT.md`](./KASPA_DEVELOPMENT.md).
- [x] ~~No production contract addresses~~ — moot, `contracts.ts` is deleted.
- [x] ~~No contract security audit~~ — moot, no contracts. Was: no Solidity source in this repo to audit. Hard
      blocker before any mainnet deployment, regardless of frontend readiness.
- [x] <a id="lint-debt"></a>**Lint debt — cleared 2026-09-05.** `npx eslint .` now reports
      **0 problems across 110 linted files** (verified via `--format json` and a file
      count, not just a clean-looking summary — a suspiciously empty result is exactly
      what `MIND.md` principle #6 says to check rather than celebrate). Previously 21
      errors + 2 config-file warnings. Resolved in two parts: the
      `react-hooks/set-state-in-effect` instances were refactored out across
      `Sidebar.tsx`, `VotingSection.tsx`, `WalletContext.tsx`, `useKasware.ts`,
      `useKaswareEvmWallet.ts`, `EcosystemAdmin/page.tsx`, `domains/my-votes/page.tsx`,
      `domains/page.tsx`, `search/page.tsx`, `DomainLikeCount.tsx`, and
      `domain/update/[name]/page.tsx` (derived `useMemo` values and cancellation-flag
      effects instead of `setState` in an effect body), and all 5
      `react-hooks/static-components` instances disappeared with the rewrite of
      `domains/new-listings/page.tsx` into a redirect. Now enforced: the CI workflow added
      the same day runs `npm run lint` on every push and PR, so this can't silently drift
      back.

      **What the zero does and doesn't mean** (checked by reading the diffs, not just the
      count — see `MIND.md` principle #13): some of those refactors are real
      (`my-votes/page.tsx` derives `data ?? []` instead of mirroring it into state;
      `search/page.tsx` and `DomainLikeCount.tsx` relocated their guards intact). Others
      are cosmetic: `useKaswareEvmWallet.ts` and `WalletContext.tsx` wrap the same
      synchronous `setState` in an `async function` so the rule stops matching, while the
      cascading-render behaviour the rule warns about is unchanged — `useKaswareEvmWallet`
      in particular now carries noticeably more async-cleanup machinery for no behavioural
      gain. And one was an outright regression, caught and fixed separately (the resource
      editor's dropped `linksLoading` guard, see `BUGS.md`). Two smaller deltas were left
      alone as cosmetic: `Sidebar.tsx` now clears its search box only when the toggle
      button collapses it, rather than on any collapse.
- [ ] **`ethers` and `viem` are both still dependencies** but the EVM path is gone. `ethers` is used only for `keccak256` in the listing route; `viem` may now be unused entirely. Worth checking and dropping — two chain libraries for one hash function is a lot of dependency surface.
- [x] ~~Confirm whether `https://supabase.com` in the CSP `connect-src` reflects
      real/planned infra or can be removed~~ — answered 2026-09-05: it was a leftover
      *and* it was the wrong host (clients call `https://<ref>.supabase.co`, never the
      marketing site). Supabase is now genuinely used as the primary store, and the
      allowlist entry is derived from `NEXT_PUBLIC_SUPABASE_URL` — correct when
      configured, absent when not. See [`ARCHITECTURE.md`](./ARCHITECTURE.md#data-model).

## Unverified (not gaps or bugs — genuinely unknown, needs testing)

- [x] ~~Whether `DomainCategoriesStorage.updateCategories` and
      `DomainLinksStorage.updateLinks` are callable by a domain owner or are admin-gated —
      no Solidity source to check, only testable on testnet with a real wallet.
- [ ] The Kasware→Kasplex EVM-signing integration (MetaMask replacement) against a real
      Kasware browser extension — passes all static checks, never run against real
      hardware.

## Watching, not actionable yet

- [ ] **KCC-0020** (Kaspa's draft covenant-native token standard) — a possible future
      successor to KRC-20 on Kaspa **L1**. Doesn't apply to this repo: `KDCToken` is a
      Solidity ERC-20 on **Kasplex (EVM L2)**, a different technology stack from L1
      covenant/UTXO conventions. Kaspa L1 covenants themselves shipped for real via the
      **Toccata hard fork (2026-06-30)** — see
      [`KASPA_DEVELOPMENT.md`](./KASPA_DEVELOPMENT.md) — but that doesn't change this
      assessment on its own. Revisit only if KCC-0020 itself finalizes and there's a
      concrete interop reason (e.g. a bridge). Sources:
      [kaspanet/kccs](https://github.com/kaspanet/kccs),
      [Kasplex KRC-20 wiki](https://wiki.kaspa.org/en/Kasplex_KRC_20).
- [ ] **Igra Network** — a separate EVM L2 on Kaspa L1 (a different "based rollup" from
      Kasplex, which this project uses). Launched a public, Sigma-Prime-audited mainnet
      (2026-03-19). Worth watching as a possible mainnet target, but switching means
      deploying all contracts fresh on a different chain — not a config change. See
      [`KASPA_DEVELOPMENT.md`](./KASPA_DEVELOPMENT.md#2-layer-2s-where-this-apps-contracts-actually-live)
      for what's known about it so far; not evaluated in depth yet.

## Related docs

- [`BUGS.md`](./BUGS.md) — things that are broken, not just missing.
- [`SPEC.md`](./SPEC.md) — the verified technical reference these gaps are measured against.
- [`LIFECYCLE.md`](./LIFECYCLE.md) — how a domain/fee/vote is meant to flow once these gaps
  are closed.
- [`KASPA_DEVELOPMENT.md`](./KASPA_DEVELOPMENT.md) — current Kaspa/Kasplex/Igra ecosystem
  state and a phased plan for closing the mainnet/deployment gaps above.
- [`TODO.md`](./TODO.md) — live backlog, updated by the recurring audit loop.
