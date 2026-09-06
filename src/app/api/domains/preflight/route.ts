// src/app/api/domains/preflight/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseAdminClient, isSupabaseWritable } from '@/lib/supabase';
import {
  requireDomainOwner,
  verifySignedRequest,
  VerificationError,
  extractPayload,
} from '@/lib/server/verifyRequest';
import { issuePaymentIntent, type IntentAction } from '@/lib/server/paymentIntent';
import { REQUIRED_SCHEMA_VERSION } from '@/lib/database.types';
import { MAX_CATEGORIES } from '@/lib/categories';
import {
  LISTING_FEE_SOMPI,
  VOTE_FEE_SOMPI,
  TREASURY_ADDRESS,
  isFeeCollectionConfigured,
} from '@/lib/fees';

export const runtime = 'nodejs';

/**
 * Run every check that can fail, **before** the wallet is asked for money.
 *
 * The problem this solves: the browser decided to use the off-chain flow from
 * the *public* Supabase key, then paid, and only then discovered whether the
 * server could actually write -- which depends on a *different*, server-only
 * key, and on ownership, duplicate state and category validity besides. A
 * deployment with a valid public key and a missing secret one would take 200 KAS
 * and answer 503.
 *
 * So: signature, ownership, write-readiness, target existence, duplicate state
 * and categories are all checked here for free. Only if all of them pass does
 * the caller get a payment intent and a price, and only then does the wallet see
 * a prompt.
 *
 * This costs nothing and moves nothing. It is a signed request rather than an
 * open one so that it cannot be used to enumerate who owns what, or to probe the
 * category table.
 *
 * **It is not a security boundary.** Every write route still verifies the
 * signature, re-reads the KNS owner, re-verifies the payment against the chain
 * and consumes the receipt through the global ledger. Deleting this endpoint
 * would make nothing forgeable -- it would only put users back to paying before
 * finding out.
 */
export async function POST(request: Request) {
  let body: {
    action?: string;
    domain?: string;
    publicKey?: string;
    issuedAt?: number;
    signature?: string;
    categories?: string[];
  };

  try {
    const parsed: unknown = await request.json();
    // JSON `null`, `[1,2]` and `"x"` all parse without throwing, and every field
    // read after this assumes an object -- so without this check they produce a
    // TypeError and a 500 on an unauthenticated request. The links and
    // categories routes already had it; these three did not.
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return NextResponse.json({ error: 'Expected a JSON object.' }, { status: 400 });
    }
    body = parsed as typeof body;
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const action = body.action === 'vote' ? 'vote' : body.action === 'list-domain' ? 'list-domain' : null;
  if (!action) {
    return NextResponse.json(
      { error: 'Unknown action. Expected "list-domain" or "vote".' },
      { status: 400 }
    );
  }

  // Checked first, and separately from ownership: these are the two failures
  // that used to happen *after* payment, and they have nothing to do with the
  // caller. Report them before asking anyone to sign anything.
  if (!isSupabaseWritable) {
    return NextResponse.json(
      { error: 'This action is temporarily unavailable on this deployment.' },
      { status: 503 }
    );
  }
  if (!isFeeCollectionConfigured) {
    return NextResponse.json(
      { error: 'Payments are not configured on this deployment, so this action is unavailable.' },
      { status: 503 }
    );
  }

  const payload = extractPayload(body as Record<string, unknown>);
  const envelope = {
    // A distinct action, so a preflight signature can never be replayed as the
    // write it was previewing.
    action: 'preflight' as const,
    domain: String(body.domain ?? ''),
    publicKey: String(body.publicKey ?? ''),
    issuedAt: Number(body.issuedAt ?? 0),
    signature: String(body.signature ?? ''),
    payload,
  };

  let verified;
  try {
    // Listing requires ownership; voting does not, and demanding it would stop
    // anyone voting for a domain they do not own -- which is the entire point.
    verified =
      action === 'list-domain'
        ? await requireDomainOwner(envelope)
        : await verifySignedRequest(envelope);
  } catch (error) {
    if (error instanceof VerificationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  const supabase = getSupabaseAdminClient();

  // Is the database actually new enough for the code that will do the write?
  //
  // The paid write goes through `create_listing` / `record_vote`, which arrived
  // in migration 3. A database that predates them fails at the *write* -- which
  // is after the money has gone. Checking here costs one cheap call and turns a
  // paid failure into a refusal.
  const { data: schemaVersion, error: versionError } = await supabase.rpc(
    'kaspadomains_schema_version'
  );

  if (versionError || Number(schemaVersion ?? 0) < REQUIRED_SCHEMA_VERSION) {
    console.error(
      'Schema version check failed:',
      versionError ?? `found ${schemaVersion}, need ${REQUIRED_SCHEMA_VERSION}`
    );
    return NextResponse.json(
      { error: 'This deployment is not finished setting up, so this action is unavailable.' },
      { status: 503 }
    );
  }

  const { data: existing, error: lookupError } = await supabase
    .from('domains')
    .select('id')
    .eq('name', verified.domain)
    .maybeSingle();

  if (lookupError) {
    console.error('Preflight lookup failed:', lookupError);
    return NextResponse.json({ error: 'Could not check that domain.' }, { status: 500 });
  }

  let amountSompi: bigint;

  if (action === 'list-domain') {
    if (existing) {
      return NextResponse.json({ error: 'That domain is already listed.' }, { status: 409 });
    }

    const categories = Array.from(
      new Set(
        (Array.isArray(body.categories) ? body.categories : [])
          .map((c) => String(c ?? '').trim())
          .filter(Boolean)
      )
    );

    if (categories.length === 0) {
      return NextResponse.json(
        { error: 'Pick at least one category before listing.' },
        { status: 400 }
      );
    }

    // Checked here as well as in the write route, so an over-categorised
    // listing is refused before the wallet is asked to pay rather than after
    // (docs/MIND.md #16).
    if (categories.length > MAX_CATEGORIES) {
      return NextResponse.json(
        { error: `At most ${MAX_CATEGORIES} categories are allowed.` },
        { status: 400 }
      );
    }

    const { data: allowed, error: allowedError } = await supabase
      .from('categories')
      .select('key')
      .eq('is_allowed', true)
      .in('key', categories);

    if (allowedError) {
      console.error('Preflight category check failed:', allowedError);
      return NextResponse.json({ error: 'Could not check those categories.' }, { status: 500 });
    }

    const allowedKeys = new Set((allowed ?? []).map((row) => row.key));
    const rejected = categories.filter((key) => !allowedKeys.has(key));
    if (rejected.length > 0) {
      return NextResponse.json(
        { error: `Not a category you can list under: ${rejected.join(', ')}.` },
        { status: 400 }
      );
    }

    amountSompi = LISTING_FEE_SOMPI;
  } else {
    if (!existing) {
      return NextResponse.json({ error: 'That domain is not listed.' }, { status: 404 });
    }

    const { data: priorVote, error: voteLookupError } = await supabase
      .from('votes')
      .select('id')
      .eq('domain_id', existing.id)
      .eq('voter', verified.signerAddress)
      .maybeSingle();

    if (voteLookupError) {
      console.error('Preflight vote check failed:', voteLookupError);
      return NextResponse.json({ error: 'Could not check your vote.' }, { status: 500 });
    }
    if (priorVote) {
      return NextResponse.json(
        { error: 'This wallet has already voted for that domain.' },
        { status: 409 }
      );
    }

    amountSompi = VOTE_FEE_SOMPI;
  }

  const { intent, expiresAt } = issuePaymentIntent({
    action: action as IntentAction,
    domain: verified.domain,
    signer: verified.signerAddress,
    amountSompi: amountSompi.toString(),
  });

  return NextResponse.json({
    ok: true,
    intent,
    expiresAt,
    amountSompi: amountSompi.toString(),
    // Echoed so the client pays what the server just quoted, rather than what
    // its own copy of the config happens to say. The server re-checks the
    // resulting transaction against its own value anyway.
    treasury: TREASURY_ADDRESS,
  });
}
