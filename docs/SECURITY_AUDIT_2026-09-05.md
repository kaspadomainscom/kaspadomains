# Security Audit — 2026-09-05

**Status:** Findings documented; no security fixes were applied by this audit.

**Audit target:** committed HEAD 01564335028e54eaaa7228faeb6f3f0c458cecdc.

**Working-tree note:** src/lib/signedMessage.ts, src/lib/signedFetch.ts, and
src/lib/server/verifyRequest.ts contain an uncommitted attempt to bind request
bodies into signatures. It is incomplete: npx tsc --noEmit currently reports
four errors because the server and routes do not supply the new payload digest.
Treat it as an in-progress, fail-closed availability regression, not as a
deployed fix for SA-01.

## Scope and method

The review covered browser payment/signing, API write routes, KNS ownership
verification, Supabase schema/RLS, public rendering/CSP paths, and the
production dependency lockfile. It was source-led and read-only: no wallet,
contract, database write, or fund movement was performed.

Severity reflects impact on user funds, authorization, profile integrity, or
availability in this application. It is not a CVSS score.

## Executive summary

Do **not** expose paid listing or voting to real users until the first four
findings are resolved and verified against a real Supabase project and Kasware
wallet:

1. A qualifying on-chain payment transaction is a bearer coupon: the API does
   not prove its payer is the verified requester.
2. One receipt can be spent once in domains and again in votes.
3. The client moves KAS before the server confirms it can fulfill the action.
4. The signature covers the action envelope but not the state-changing body.

## Confirmed findings

### SA-01 — High: signed requests do not authenticate their bodies

**Affected code:**

- src/lib/signedMessage.ts:19-31
- src/lib/signedFetch.ts:87-107
- src/lib/server/verifyRequest.ts:134-165
- src/app/api/domains/route.ts:49-70,82-85
- src/app/api/domains/[name]/links/route.ts:39-53,76-82,124-155
- src/app/api/domains/[name]/vote/route.ts:33-61

The committed signed message contains only action, domain, publicKey, and
issuedAt. The client appends links, categories, and paymentTxId to the JSON body
only after signing. The server independently reads those fields after verifying
the envelope.

**Exploit precondition:** an attacker obtains an unexpired signature for an
owner's action/domain, such as through a captured request or deceptive
wallet-signing prompt. Signatures remain valid for five minutes.

**Impact:** the attacker can substitute an owner's complete link set; listing
categories and payment receipt can also be substituted. The signature approves a
broad action rather than the mutation that is persisted.

**Required remediation:**

- Canonicalize the exact body, hash it, and include the digest in the signed
  message on both client and server.
- Have each route pass the exact received payload into verification.
- Test that changing one link, category, or paymentTxId invalidates the
  signature.
- Display a human-readable action summary in the wallet prompt; a bare hash is
  not a sufficient anti-phishing user experience.

Body binding is necessary, but it does not solve the independent payment receipt
flaws in SA-02 through SA-04.

### SA-02 — High: payment receipts are bearer coupons, not attributable to the requester

**Affected code:**

- src/lib/server/verifyPayment.ts:45-116
- src/app/api/domains/route.ts:82-85
- src/app/api/domains/[name]/vote/route.ts:58-61
- src/hooks/domain/useListDomain.ts:53-67

verifyPayment receives only a transaction ID and required amount. It asks the
Kaspa API not to resolve previous outpoints, then accepts a transaction solely
because its output total to the treasury meets the fee. It does not receive,
derive, or compare the verified signing address with a payer or a
server-issued invoice.

**Exploit flow:**

1. A victim sends a 200-KAS listing payment, or an attacker finds any
   qualifying historic treasury payment on the public chain.
2. The attacker signs a valid request for their own KNS domain (or for a vote)
   and supplies that transaction ID.
3. The server credits the attacker's request because it proves only that
   someone paid the treasury.
4. The original customer receives a duplicate-payment error when they submit.

**Impact:** fee theft/misattribution, front-running of paid listings, and
denial of a paid listing to its actual payer.

**Required remediation:** create a short-lived server-side payment intent bound
to the verified signer, action, and domain before payment. The chain evidence
must demonstrate that the intent's payer controls the required source/address
(for example by resolving input outpoints where Kasware's account model makes
that sound), or use a unique per-intent collection address / safely reserved
exact payment amount. Never accept an arbitrary transaction ID as proof of
someone else's purchase.

### SA-03 — Medium: one payment can fund both a listing and a vote

**Affected code:**

- supabase/schema.sql:41-46
- supabase/schema.sql:81-90
- src/app/api/domains/route.ts:99-114
- src/app/api/domains/[name]/vote/route.ts:85-92

domains.payment_tx_id and votes.payment_tx_id each have a separate unique
constraint. There is no global receipt ledger. A 200-KAS listing receipt passes
the 1-KAS vote threshold and can be inserted into the vote table after being
used in the domain table.

**Impact:** one payment buys two different paid actions. It also lets an
attacker use a visible listing receipt for a free vote without consuming the
victim's listing.

**Required remediation:** use a single payment_receipts or payment_intents
table with a globally unique normalized transaction ID. Mark the receipt
consumed in the same database transaction that fulfills the listing or vote. If
overpayment or credits are intended, model allocations explicitly rather than
relying on separate table constraints.

### SA-04 — High: users can pay before the server proves it can fulfill the action

**Affected code:**

- src/lib/supabase.ts:16-33
- src/hooks/domain/useListDomain.ts:53-71
- src/components/pages/domain/VotingSection.tsx:213-226
- src/app/api/domains/route.ts:26-31,49-76
- src/app/api/domains/[name]/vote/route.ts:27-29,40-82

The browser selects the off-chain flow when public Supabase read credentials
exist (isSupabaseConfigured). It calls payFee before it signs/posts the request.
The API separately requires the server-only service-role key
(isSupabaseWritable) and can reject afterwards for configuration, duplicate,
ownership, category, or target-state reasons.

**Concrete reproduction:** deploy a valid public Supabase URL/key and treasury
address but omit or misname SUPABASE_SECRET_KEY. The browser sends 200 KAS for
listing (or 1 KAS for voting); the route immediately returns 503 because it
cannot write.

**Impact:** real funds can leave a user's wallet without the requested action
being fulfilled. The failed receipt is also vulnerable to SA-02 until the
payment design is repaired.

**Required remediation:** add an authenticated, no-fee preflight endpoint that
checks server write readiness, KNS ownership, target existence, duplicate
state, and selected categories before the wallet payment prompt. Return a
short-lived payment intent, then preserve a failed receipt safely for retry only
after SA-02 and SA-03 are fixed.

### SA-05 — Medium: a captured link-update signature can be replayed

**Affected code:**

- src/lib/server/verifyRequest.ts:145-159
- src/app/api/domains/[name]/links/route.ts:124-155

The timestamp limits a signature to five minutes but the server records no used
nonce, request ID, or profile version. A valid captured update-links request can
therefore be replayed during that interval. Since the route deletes and
reinserts the entire link set, replaying an older update can roll back a newer
profile. Concurrent replays can also interleave delete/insert operations and
leave duplicate or mixed link rows.

**Required remediation:** include a server-issued nonce/idempotency key in the
signed payload and atomically consume it before mutation. Add a profile revision
and require it to match for stale-write protection. Perform replacement in one
database transaction/RPC and add a suitable uniqueness constraint for link
position if the data model requires it.

### SA-06 — Low: CSP-report ingestion accepts and logs unbounded attacker input

**Affected code:** src/app/api/csp-violation-report/route.ts:5-15.

Any client may POST a JSON body. The route fully parses and logs the raw object
without a size limit, schema validation, or rate limit.

**Impact:** application memory/CPU and production logging can be exhausted or
made expensive. CDN/request limits may reduce the real-world impact, so this is
an application-layer availability finding rather than proof of production-wide
denial of service.

**Required remediation:** impose a small body limit, accept only expected CSP
report fields, truncate/redact logged fields, and rate limit at the edge.

### SA-07 — Low: the API bypasses the category allow-list

**Affected code:**

- src/app/api/domains/route.ts:49-59,134-136
- supabase/schema.sql:60-70
- src/data/supabaseSource.ts:107-118

The UI presents only allowed categories, but the route accepts any nonempty
existing category key. The foreign key proves existence; it does not enforce
categories.is_allowed = true.

**Impact:** a verified owner can bypass the category publication/moderation
policy. Currently the read manifest hides disallowed category membership, which
limits public impact, but the server-side policy boundary is not enforced.

**Required remediation:** validate every category against is_allowed = true
inside the same database transaction that creates the listing.

### SA-08 — Low: listing fulfillment and payment consumption are not atomic

**Affected code:** src/app/api/domains/route.ts:99-148.

The route inserts the paid domain row and then inserts category rows in a
separate request. On category failure it attempts a rollback but does not verify
that deletion succeeded, while returning that the listing was not created.

**Impact:** a database/network failure can leave a paid listing active while the
user sees an error and may pay again. This is primarily a funds-safety and
reliability issue; a reliable remote exploit was not demonstrated.

**Required remediation:** use one transactional database function to validate
categories, consume the global payment receipt, create the listing, and attach
categories all-or-nothing.

### SA-09 — Dependency exposure: vulnerable ws packages in the lockfile

**Affected lockfile entries:**

- package-lock.json:4243 — ws@8.17.1 under ethers
- package-lock.json:7479 — ws@8.18.2 under viem

Both versions fall below the patched ws@8.21.0 release for
[GHSA-96hv-2xvq-fx4p / CVE-2026-48779](https://github.com/advisories/GHSA-96hv-2xvq-fx4p),
a high-severity memory-exhaustion issue. ws@8.18.2 also falls below 8.20.1,
which fixes
[GHSA-58qx-3vcg-4xpx / CVE-2026-45736](https://github.com/advisories/GHSA-58qx-3vcg-4xpx).

The application's observed Kasplex client uses HTTP rather than WebSocket
transport, so no reachable application exploit was established in this audit.
Treat this as confirmed vulnerable dependency exposure, prioritize it before
adding WebSocket transport/server use, and update ethers/viem or apply a tested
lockfile override to ws >= 8.21.0.

## Verification limits and no-finding areas

The following protections were present in source and no direct bypass was found:

- Listing and resource edits verify a Kaspa L1 signature, derive its address,
  and compare it with a server-side KNS owner lookup.
- Votes use the verified signing address, and (domain_id, voter) prevents a
  second vote from that exact address.
- KNS requests use fixed HTTPS hosts with URL-encoded domains; no SSRF or domain
  injection path was found.
- The supplied Supabase schema enables RLS and contains public SELECT only; no
  public write policy or committed service-role secret was found. This still
  needs the existing live-project RLS probe before production.
- React escaping, http(s) link validation, noopener/noreferrer, and the
  nonce-based CSP prevented a confirmed reflected/stored XSS finding.
- Wallet transaction paths use Kasware's named EVM provider; no concrete
  provider-substitution or wallet-drain path was found.

npm audit --omit=dev --json could not run locally because npm rejected the
available certificate chain; the dependency versions and GitHub advisories were
verified separately. A live Supabase project, real Kasware extension, and a
non-money-moving test fixture were not available, so those surfaces remain
partially unverified.

## Recommended repair order

1. Disable paid listing/voting in production until SA-02, SA-03, and SA-04 are
   fixed and exercised with a real wallet and database.
2. Design and implement a server-issued, signer-bound payment intent and global
   receipt ledger as one transactional flow.
3. Complete SA-01 body binding, then add one-time nonce and revision checks for
   SA-05.
4. Make listing/category and link replacement atomic database operations.
5. Add edge/API input limits and CSP-report rate limiting.
6. Upgrade the vulnerable ws dependencies and rerun the dependency audit.

## Required regression evidence before reopening paid actions

- Altering one signed link/category/payment ID makes signature verification fail.
- A payment from another signer or historic unrelated transaction is rejected.
- One transaction ID cannot satisfy more than one action across all action types.
- Server misconfiguration, duplicate listing, invalid category, stale KNS owner,
  and already-voted cases fail before the wallet is asked to pay.
- Replay of a used nonce and stale revision both fail without changing links.
- A forced category insert failure rolls back every listing/payment-intent write.
- The live RLS probe confirms the public key cannot insert/update/delete.
- npm run lint, npx tsc --noEmit, npm run build, and the dependency audit all
  pass on the final committed tree.

