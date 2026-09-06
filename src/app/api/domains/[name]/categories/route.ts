// src/app/api/domains/[name]/categories/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseAdminClient, isSupabaseWritable } from '@/lib/supabase';
import { requireDomainOwner, VerificationError, extractPayload } from '@/lib/server/verifyRequest';
import { rpcError } from '@/lib/server/rpcError';
import { MAX_CATEGORIES } from '@/lib/categories';
import { parseProfileRevision } from '@/lib/profileWrite';

export const runtime = 'nodejs';

function setupUnavailable(error?: { code?: string } | null) {
  return error?.code === 'PGRST202' ||
    error?.code === 'PGRST204' ||
    error?.code === 'PGRST205' ||
    error?.code === '42P01' ||
    error?.code === '42703';
}

// The cap is owned by @/lib/categories and enforced at listing time too.

/**
 * Replace a listing's categories (the off-chain
 * `DomainCategoriesStorage.updateCategories`).
 *
 * This closes the last write the contracts could do that Supabase could not.
 * Until now categories were set once at listing time and never again, so an
 * owner who picked wrongly had no way back short of paying to relist.
 *
 * Like the resources editor this is a **bulk replace**: the body carries the
 * complete desired set, and anything omitted is removed. And like every other
 * write here, **only the domain's current KNS owner may do it**, re-checked
 * against KNS on each request rather than against whoever created the row --
 * so a KNS transfer moves this permission with the domain.
 *
 * No fee. Listing costs 200 KAS and voting 1 KAS because both create something;
 * correcting a category on a listing already paid for does not, and charging
 * for it would just leave miscategorised listings in place.
 */
export async function PUT(
  request: Request,
  context: { params: Promise<{ name: string }> }
) {
  if (!isSupabaseWritable) {
    return NextResponse.json(
      { error: 'Editing categories is temporarily unavailable.' },
      { status: 503 }
    );
  }

  const { name } = await context.params;

  let body: {
    publicKey?: string;
    issuedAt?: number;
    signature?: string;
    categories?: string[];
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

  const categories = Array.from(
    new Set(
      (Array.isArray(body.categories) ? body.categories : [])
        .map((c) => String(c ?? '').trim())
        .filter(Boolean)
    )
  );

  // A listing with no categories is invisible: every browse page is driven by
  // category membership, so an empty set silently unlists the domain while
  // still leaving the owner charged for it. Refuse rather than let that happen
  // by accident.
  if (categories.length === 0) {
    return NextResponse.json(
      { error: 'Pick at least one category. A listing with none cannot be found.' },
      { status: 400 }
    );
  }

  if (categories.length > MAX_CATEGORIES) {
    return NextResponse.json(
      { error: `At most ${MAX_CATEGORIES} categories are allowed.` },
      { status: 400 }
    );
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
    verified = await requireDomainOwner({
      action: 'update-categories',
      domain: requestedDomain,
      publicKey: String(body.publicKey ?? ''),
      issuedAt: Number(body.issuedAt ?? 0),
      signature: String(body.signature ?? ''),
      // The category list is the entire point of the request, so it has to be
      // inside the signature -- otherwise a captured signature could be
      // replayed to move someone's listing wherever the attacker liked.
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
    console.error('Category lookup failed:', lookupError);
    return NextResponse.json({ error: 'Could not update categories.' }, { status: 500 });
  }
  if (!domain) {
    return NextResponse.json({ error: 'That domain is not listed.' }, { status: 404 });
  }

  // One transactional call. The allow-list check lives inside it, so it is
  // evaluated against the same snapshot as the write -- and the add and the
  // remove can no longer be separated by a failure, which previously left a
  // listing in categories its owner had just removed.
  const { data: nextProfileRevision, error: rpcFailure } = await supabase.rpc('replace_domain_categories', {
    p_name: verified.domain,
    p_categories: categories,
    p_nonce: nonce,
    p_expected_revision: profileRevision,
    p_signer: verified.signerAddress,
  });

  if (rpcFailure) {
    const mapped = rpcError(rpcFailure, 'Could not update categories.');
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  return NextResponse.json({ categories, profileRevision: nextProfileRevision }, { status: 200 });
}

/**
 * The listing's current categories, so the editor can load before it saves.
 *
 * Public: category membership is already visible on every browse page, so there
 * is nothing here to protect. It reads through the anon-key client for that
 * reason -- a read endpoint has no business holding the service-role key.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ name: string }> }
) {
  const { name } = await context.params;

  let domain: string;
  try {
    domain = decodeURIComponent(name).trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: 'The domain name is malformed.' }, { status: 400 });
  }

  const { getSupabaseReadClient } = await import('@/lib/supabase');
  const supabase = getSupabaseReadClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Categories are unavailable.' }, { status: 503 });
  }

  const { data, error } = await supabase
    .from('domains')
    .select('id, profile_revision, domain_categories (category_key)')
    .eq('name', domain)
    .maybeSingle();

  if (error) {
    console.error('Category read failed:', error);
    return NextResponse.json(
      {
        error: setupUnavailable(error)
          ? 'This deployment is not finished setting up profile editing.'
          : 'Could not load categories.',
      },
      { status: setupUnavailable(error) ? 503 : 500 }
    );
  }
  if (!data) {
    return NextResponse.json({ error: 'That domain is not listed.' }, { status: 404 });
  }

  const profileRevision = parseProfileRevision(data.profile_revision);
  if (profileRevision === null) {
    console.error('Invalid stored profile revision:', data.profile_revision);
    return NextResponse.json({ error: 'Could not load the current profile revision.' }, { status: 503 });
  }

  const rows = (data.domain_categories ?? []) as { category_key: string }[];
  return NextResponse.json({ categories: rows.map((row) => row.category_key), profileRevision });
}
