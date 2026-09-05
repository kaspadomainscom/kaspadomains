// src/app/api/domains/route.ts
import { NextResponse } from 'next/server';
import { keccak256, toUtf8Bytes } from 'ethers';
import { getSupabaseAdminClient, isSupabaseWritable } from '@/lib/supabase';
import { requireDomainOwner, VerificationError } from '@/lib/server/verifyRequest';

export const runtime = 'nodejs';

/**
 * Create a listing.
 *
 * Replaces `KaspaDomainsRegistry.listDomain`. Two things the contract used to
 * do that this has to do explicitly:
 *   1. Refuse duplicate listings (the unique constraint on `name` does this).
 *   2. Record an owner that the caller cannot choose (KNS is read server-side).
 *
 * What it deliberately does NOT do is collect a fee. The 420 KAS charge lived
 * in the registry contract, which has no deployed code, so listings are
 * currently free -- see docs/GAPS.md, this needs an owner decision rather than
 * a silent default.
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
      fee_paid: '0',
      is_active: true,
    })
    .select('id, name')
    .single();

  if (insertError) {
    // 23505 = unique_violation, i.e. this domain is already listed.
    if (insertError.code === '23505') {
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
