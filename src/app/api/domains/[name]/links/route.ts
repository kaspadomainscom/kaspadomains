// src/app/api/domains/[name]/links/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseAdminClient, isSupabaseWritable } from '@/lib/supabase';
import { verifySignedRequest, VerificationError } from '@/lib/server/verifyRequest';

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
 * Only the wallet that submitted the listing may edit it. That is a weaker
 * rule than "only the owner", and deliberately so: the submitter is the only
 * party this system can actually prove anything about (see
 * src/lib/server/verifyRequest.ts).
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
    address?: string;
    issuedAt?: number;
    signature?: string;
    links?: { name?: string; url?: string }[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
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

  let verified;
  try {
    verified = await verifySignedRequest({
      action: 'update-links',
      domain: decodeURIComponent(name),
      address: String(body.address ?? ''),
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

  const { data: domain, error: lookupError } = await supabase
    .from('domains')
    .select('id, submitted_by')
    .ilike('name', verified.domain)
    .maybeSingle();

  if (lookupError) {
    console.error('Links lookup failed:', lookupError);
    return NextResponse.json({ error: 'Could not update resources.' }, { status: 500 });
  }
  if (!domain) {
    return NextResponse.json({ error: 'That domain is not listed.' }, { status: 404 });
  }

  if ((domain.submitted_by ?? '').toLowerCase() !== verified.submittedBy) {
    return NextResponse.json(
      { error: 'Only the wallet that created this listing can edit its resources.' },
      { status: 403 }
    );
  }

  // Replace wholesale, in a delete-then-insert. Postgres runs each statement
  // atomically but these are two round trips: if the insert fails the links
  // are left empty, which is visible and recoverable by saving again, rather
  // than silently merging old and new rows.
  const { error: deleteError } = await supabase
    .from('domain_links')
    .delete()
    .eq('domain_id', domain.id);

  if (deleteError) {
    console.error('Failed to clear existing links:', deleteError);
    return NextResponse.json({ error: 'Could not update resources.' }, { status: 500 });
  }

  if (links.length > 0) {
    const { error: insertError } = await supabase.from('domain_links').insert(
      links.map((link, position) => ({
        domain_id: domain.id,
        name: link.name,
        url: link.url,
        position,
      }))
    );

    if (insertError) {
      console.error('Failed to insert links:', insertError);
      return NextResponse.json(
        { error: 'Resources were cleared but not saved. Please try again.' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ links }, { status: 200 });
}
