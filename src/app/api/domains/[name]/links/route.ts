// src/app/api/domains/[name]/links/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseAdminClient, isSupabaseWritable } from '@/lib/supabase';
import { requireDomainOwner, VerificationError, extractPayload } from '@/lib/server/verifyRequest';
import { rpcError } from '@/lib/server/rpcError';
import { parseProfileRevision } from '@/lib/profileWrite';

export const runtime = 'nodejs';

/** Mirrors DomainLinksStorage.MAX_LINKS, which the editor used to read on-chain. */
const MAX_LINKS = 10;

/**
 * Replace a domain's resources (the off-chain DomainLinksStorage.updateLinks).
 *
 * This is a bulk replace, exactly like the contract call it replaces, so the
 * request body must contain the complete desired list -- a partial list
 * deletes the omitted rows. The editor is responsible for loading the current
 * links before submitting; see the data-loss race in docs/BUGS.md for what
 * happens when it doesn't.
 *
 * **Only the domain's current KNS owner may edit it.** This is checked afresh
 * on every request rather than against whoever created the listing, so a
 * domain that changes hands on KNS immediately becomes editable by its new
 * owner and stops being editable by the old one -- no re-listing, no stale
 * permission. See src/lib/server/verifyRequest.ts.
 */
export async function PUT(
  request: Request,
  context: { params: Promise<{ name: string }> }
) {
  if (!isSupabaseWritable) {
    return NextResponse.json(
      { error: 'Editing resources is temporarily unavailable.' },
      { status: 503 }
    );
  }

  const { name } = await context.params;

  let body: {
    publicKey?: string;
    issuedAt?: number;
    signature?: string;
    links?: { name?: string; url?: string }[];
    nonce?: string;
    profileRevision?: unknown;
  };
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return NextResponse.json({ error: 'Expected a JSON object.' }, { status: 400 });
    }
    body = parsed as typeof body;
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  let requestedDomain: string;
  try {
    requestedDomain = decodeURIComponent(name);
  } catch {
    return NextResponse.json({ error: 'The domain name is malformed.' }, { status: 400 });
  }

  const links = (Array.isArray(body.links) ? body.links : [])
    .map((link) => ({ name: String(link?.name ?? '').trim(), url: String(link?.url ?? '').trim() }))
    .filter((link) => link.name.length > 0 && link.url.length > 0);

  if (links.length > MAX_LINKS) {
    return NextResponse.json(
      { error: `At most ${MAX_LINKS} links are allowed.` },
      { status: 400 }
    );
  }

  for (const link of links) {
    // Only http(s). Without this, a `javascript:` URL rendered as an anchor on
    // a public profile page is a stored XSS vector.
    if (!/^https?:\/\//i.test(link.url)) {
      return NextResponse.json(
        { error: `Links must start with http:// or https:// — "${link.url}" does not.` },
        { status: 400 }
      );
    }
  }

  const nonce = typeof body.nonce === 'string' ? body.nonce : '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(nonce)) {
    return NextResponse.json({ error: 'A valid one-time save token is required.' }, { status: 400 });
  }
  const profileRevision = parseProfileRevision(body.profileRevision);
  if (profileRevision === null) {
    return NextResponse.json({ error: 'A valid loaded profile revision is required.' }, { status: 400 });
  }

  let verified;
  try {
    // Owner-only, re-checked against KNS on every edit.
    verified = await requireDomainOwner({
      action: 'update-links',
      domain: requestedDomain,
      publicKey: String(body.publicKey ?? ''),
      issuedAt: Number(body.issuedAt ?? 0),
      signature: String(body.signature ?? ''),
      // The links array is the whole point of this request, and it used to be
      // unsigned -- a captured signature could be replayed with someone else's
      // links on the owner's public profile. It is covered now.
      payload: extractPayload(body as Record<string, unknown>),
    });
  } catch (error) {
    if (error instanceof VerificationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  const supabase = getSupabaseAdminClient();

  const { data: domain, error: lookupError } = await supabase
    .from('domains')
    .select('id, owner')
    .eq('name', verified.domain)
    .maybeSingle();

  if (lookupError) {
    console.error('Links lookup failed:', lookupError);
    return NextResponse.json({ error: 'Could not update resources.' }, { status: 500 });
  }
  if (!domain) {
    return NextResponse.json({ error: 'That domain is not listed.' }, { status: 404 });
  }

  // Authorisation already happened in requireDomainOwner, against KNS live
  // rather than against this row. Deliberately no `submitted_by` check here:
  // that would keep permission with whoever listed the domain first and lock
  // out a new owner after a KNS transfer, which is the opposite of the rule.
  //
  // If the stored owner has drifted from KNS, KNS wins -- it is the authority,
  // and this row is a cache of it.
  if ((domain.owner ?? '') !== verified.knsOwner) {
    const { error: ownerSyncError } = await supabase
      .from('domains')
      .update({ owner: verified.knsOwner, submitted_by: verified.signerAddress })
      .eq('id', domain.id);

    if (ownerSyncError) {
      console.error('Failed to sync owner from KNS:', ownerSyncError);
    }
  }

  // Replace wholesale, in one transaction.
  //
  // This was a delete followed by a separate insert, so an insert that failed
  // left the profile empty -- visible and recoverable by saving again, but still
  // a destroyed profile, and the user had no way to know their links were gone
  // rather than merely unsaved. `replace_domain_links` does both inside one
  // Postgres transaction, so a failure changes nothing at all.
  const { data: nextProfileRevision, error: rpcFailure } = await supabase.rpc('replace_domain_links', {
    p_name: verified.domain,
    p_links: links,
    p_nonce: nonce,
    p_expected_revision: profileRevision,
    // Never trust a client-supplied address for a capability. This is the
    // address proven by the signature and rechecked as the KNS owner above.
    p_signer: verified.signerAddress,
  });

  if (rpcFailure) {
    const mapped = rpcError(rpcFailure, 'Could not update resources.');
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  return NextResponse.json({ links, profileRevision: nextProfileRevision }, { status: 200 });
}
