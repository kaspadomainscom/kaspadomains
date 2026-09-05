// src/app/api/domains/route.ts
import { NextResponse } from 'next/server';
import { keccak256, toUtf8Bytes } from 'ethers';
import { getSupabaseAdminClient, isSupabaseWritable } from '@/lib/supabase';
import { requireDomainOwner, VerificationError } from '@/lib/server/verifyRequest';
import { verifyPayment } from '@/lib/server/verifyPayment';
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
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const categories = Array.isArray(body.categories)
    ? body.categories.filter((c): c is string => typeof c === 'string' && c.length > 0)
    : [];

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

  const { data: inserted, error: insertError } = await supabase
    .from('domains')
    .insert({
      domain_hash: domainHash,
      name: verified.domain,
      owner: verified.knsOwner,
      // The signer proved control of the key behind this address, and it
      // equals the KNS owner -- so submitter and owner are the same party.
      submitted_by: verified.signerAddress,
      ownership_verified: true,
      fee_paid: payment.paidSompi.toString(),
      payment_tx_id: payment.txId,
      is_active: true,
    })
    .select('id, name')
    .single();

  if (insertError) {
    // 23505 = unique_violation. Two different constraints can raise it here and
    // they mean very different things to the user, so don't collapse them: one
    // is "you already did this", the other is "that payment is already spent".
    if (insertError.code === '23505') {
      const detail = `${insertError.message} ${insertError.details ?? ''}`;
      if (detail.includes('payment_tx_id')) {
        return NextResponse.json(
          { error: 'That payment has already been used for another listing.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: 'That domain is already listed.' }, { status: 409 });
    }
    console.error('Failed to insert listing:', insertError);
    return NextResponse.json({ error: 'Could not create the listing.' }, { status: 500 });
  }

  const { error: categoryError } = await supabase.from('domain_categories').insert(
    categories.map((category_key) => ({ domain_id: inserted.id, category_key }))
  );

  if (categoryError) {
    // Roll the listing back rather than leaving an uncategorised row behind:
    // the browse pages are driven entirely by category membership, so a
    // listing with none is invisible and looks like the request silently
    // failed.
    await supabase.from('domains').delete().eq('id', inserted.id);
    console.error('Failed to attach categories, listing rolled back:', categoryError);
    return NextResponse.json(
      { error: 'Could not attach categories, so the listing was not created.' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { domain: inserted.name, ownershipVerified: true },
    { status: 201 }
  );
}
