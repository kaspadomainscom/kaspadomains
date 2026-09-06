// src/app/api/domains/route.ts
import { NextResponse } from 'next/server';
import { keccak256, toUtf8Bytes } from 'ethers';
import { getSupabaseAdminClient, isSupabaseWritable } from '@/lib/supabase';
import { requireDomainOwner, VerificationError, extractPayload } from '@/lib/server/verifyRequest';
import { verifyPayment } from '@/lib/server/verifyPayment';
import { rpcError } from '@/lib/server/rpcError';
import { verifyPaymentIntent } from '@/lib/server/paymentIntent';
import { LISTING_FEE_SOMPI } from '@/lib/fees';

export const runtime = 'nodejs';

/**
 * Create a listing.
 *
 * Replaces `KaspaDomainsRegistry.listDomain`. Three things the contract used to
 * do that this has to do explicitly:
 *   1. Refuse duplicate listings (the unique constraint on `name` does this).
 *   2. Record an owner that the caller cannot choose (KNS is read server-side).
 *   3. Take the fee -- 200 KAS, paid on Kaspa L1 to the treasury address and
 *      verified here from the txid the client supplies.
 *
 * The fee is checked *after* ownership so a non-owner is never asked to pay for
 * a listing they could not create, and the payment's txid is only consumed if
 * the row is actually written -- a failed insert leaves it reusable rather than
 * burning someone's 200 KAS.
 */
export async function POST(request: Request) {
  if (!isSupabaseWritable) {
    return NextResponse.json(
      { error: 'Listings are temporarily unavailable.' },
      { status: 503 }
    );
  }

  let body: {
    domain?: string;
    publicKey?: string;
    issuedAt?: number;
    signature?: string;
    paymentTxId?: string;
    categories?: string[];
    intent?: string;
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

  // Deduplicated, and by the same rule the preflight uses. If the two disagree,
  // a body that passes the free check can still fail inside the paid write --
  // ["tech", "tech"] would clear the preflight and then hit a primary-key
  // violation after the fee had been paid.
  const categories = Array.from(
    new Set(
      (Array.isArray(body.categories) ? body.categories : [])
        .map((c) => (typeof c === 'string' ? c.trim() : ''))
        .filter(Boolean)
    )
  );

  // Mandatory at listing time, matching the on-chain flow it replaces.
  if (categories.length === 0) {
    return NextResponse.json(
      { error: 'Pick at least one category before listing.' },
      { status: 400 }
    );
  }

  let verified;
  try {
    // Owner-only: the signer must hold the key that owns this domain on KNS.
    verified = await requireDomainOwner({
      action: 'list-domain',
      domain: String(body.domain ?? ''),
      publicKey: String(body.publicKey ?? ''),
      issuedAt: Number(body.issuedAt ?? 0),
      signature: String(body.signature ?? ''),
      // Everything outside the envelope -- categories and paymentTxId here --
      // must be covered by the signature, or a valid signature could be
      // replayed with a different body.
      payload: extractPayload(body as Record<string, unknown>),
    });
  } catch (error) {
    if (error instanceof VerificationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  // The intent proves the preflight ran and passed for this exact signer,
  // domain and price. Without it a client could go straight to paying, which is
  // the failure mode the preflight exists to remove -- so this is required, not
  // advisory.
  //
  // It is checked before the payment: an expired or missing intent means "start
  // again", and there is no reason to spend a round trip to the Kaspa API to
  // learn that.
  try {
    verifyPaymentIntent(String(body.intent ?? ''), {
      action: 'list-domain',
      domain: verified.domain,
      signer: verified.signerAddress,
      amountSompi: LISTING_FEE_SOMPI.toString(),
    });
  } catch (error) {
    if (error instanceof VerificationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  // Payment is checked after ownership, so we never ask a non-owner to pay for
  // a listing they could not have created anyway.
  let payment;
  try {
    payment = await verifyPayment({
      txId: String(body.paymentTxId ?? ''),
      requiredSompi: LISTING_FEE_SOMPI,
      // The fee must come from the same wallet that signed, or receipts are
      // bearer coupons anyone can lift off the public ledger.
      payerAddress: verified.signerAddress,
    });
  } catch (error) {
    if (error instanceof VerificationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  const supabase = getSupabaseAdminClient();

  // Same hash the contracts derive, so these rows stay reconcilable with chain
  // data if listings are ever mirrored on-chain.
  const domainHash = BigInt(keccak256(toUtf8Bytes(verified.domain))).toString();

  // One transactional call, not four round trips.
  //
  // This used to validate categories, claim the receipt, insert the listing and
  // insert the categories as separate requests, with a hand-rolled rollback if
  // the last one failed -- and the rollback's own success was never checked
  // while the response told the user nothing had been created. Between any two
  // of those the network can drop, and the user has already paid 200 KAS.
  //
  // `create_listing` does all of it inside one Postgres transaction: either the
  // receipt is consumed and the listing exists with its categories, or nothing
  // happened at all. That guarantee cannot be built in application code, because
  // two HTTP requests to PostgREST are not atomic no matter how they are
  // sequenced.
  //
  // The category allow-list check moved in there too, so it is evaluated against
  // the same snapshot as the insert -- a category withdrawn between the check
  // and the write can no longer slip through.
  const { data: listingId, error: rpcFailure } = await supabase.rpc('create_listing', {
    p_domain_hash: domainHash,
    p_name: verified.domain,
    p_owner: verified.knsOwner,
    // The signer proved control of the key behind this address, and it equals
    // the KNS owner -- so submitter and owner are the same party.
    p_submitted_by: verified.signerAddress,
    p_fee_paid: payment.paidSompi.toString(),
    p_payment_tx_id: payment.txId,
    p_payer: verified.signerAddress,
    p_categories: categories,
  });

  if (rpcFailure) {
    const mapped = rpcError(rpcFailure, 'Could not create the listing.');
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  return NextResponse.json(
    { domain: verified.domain, id: listingId, ownershipVerified: true },
    { status: 201 }
  );
}
