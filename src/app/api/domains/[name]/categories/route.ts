// src/app/api/domains/[name]/categories/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseAdminClient, isSupabaseWritable } from '@/lib/supabase';
import { requireDomainOwner, VerificationError, extractPayload } from '@/lib/server/verifyRequest';

export const runtime = 'nodejs';

/**
 * How many categories one listing may sit in.
 *
 * A cap exists because categories are the only navigation this site has: a
 * listing in every category is in effect a listing on every browse page, which
 * is spam with extra steps. Six is generous for an honest listing.
 */
const MAX_CATEGORIES = 6;

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

  let body: { publicKey?: string; issuedAt?: number; signature?: string; categories?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
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

  let verified;
  try {
    verified = await requireDomainOwner({
      action: 'update-categories',
      domain: decodeURIComponent(name),
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

  // Same allow-list check the listing route does. The foreign key proves a
  // category exists; it says nothing about whether it is currently published,
  // so without this an owner could move a listing into a withdrawn category.
  const { data: allowed, error: allowedError } = await supabase
    .from('categories')
    .select('key')
    .eq('is_allowed', true)
    .in('key', categories);

  if (allowedError) {
    console.error('Failed to check categories:', allowedError);
    return NextResponse.json({ error: 'Could not update categories.' }, { status: 500 });
  }

  const allowedKeys = new Set((allowed ?? []).map((row) => row.key));
  const rejected = categories.filter((key) => !allowedKeys.has(key));
  if (rejected.length > 0) {
    return NextResponse.json(
      { error: `Not a category you can list under: ${rejected.join(', ')}.` },
      { status: 400 }
    );
  }

  // KNS is the authority on ownership; this row caches it. If they have drifted
  // apart, the row is what is wrong.
  if ((domain.owner ?? '') !== verified.knsOwner) {
    const { error: ownerSyncError } = await supabase
      .from('domains')
      .update({ owner: verified.knsOwner, submitted_by: verified.signerAddress })
      .eq('id', domain.id);

    if (ownerSyncError) {
      console.error('Failed to sync owner from KNS:', ownerSyncError);
    }
  }

  // Add before removing, so a failure between the two leaves the listing
  // over-categorised rather than uncategorised. Over-categorised is visible and
  // fixed by saving again; uncategorised is invisible, and the owner would have
  // no page left to fix it from. `ignoreDuplicates` makes the add idempotent,
  // so a retry after a partial failure is safe.
  const { error: insertError } = await supabase
    .from('domain_categories')
    .upsert(
      categories.map((category_key) => ({ domain_id: domain.id, category_key })),
      { onConflict: 'domain_id,category_key', ignoreDuplicates: true }
    );

  if (insertError) {
    console.error('Failed to insert categories:', insertError);
    return NextResponse.json({ error: 'Could not update categories.' }, { status: 500 });
  }

  const { data: existing, error: existingError } = await supabase
    .from('domain_categories')
    .select('category_key')
    .eq('domain_id', domain.id);

  if (existingError) {
    console.error('Failed to read current categories:', existingError);
    return NextResponse.json(
      { error: 'The new categories were saved, but the old ones may remain. Save again.' },
      { status: 500 }
    );
  }

  // Delete by an explicit list of keys rather than a negated filter, so nothing
  // has to be spliced into a PostgREST filter string by hand.
  const stale = (existing ?? [])
    .map((row) => row.category_key)
    .filter((key) => !categories.includes(key));

  if (stale.length > 0) {
    const { error: deleteError } = await supabase
      .from('domain_categories')
      .delete()
      .eq('domain_id', domain.id)
      .in('category_key', stale);

    if (deleteError) {
      console.error('Failed to remove old categories:', deleteError);
      return NextResponse.json(
        {
          error:
            'The new categories were saved, but the old ones could not be removed. Save again to finish.',
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ categories }, { status: 200 });
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

  const { getSupabaseReadClient } = await import('@/lib/supabase');
  const supabase = getSupabaseReadClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Categories are unavailable.' }, { status: 503 });
  }

  const { data, error } = await supabase
    .from('domains')
    .select('id, domain_categories (category_key)')
    .eq('name', decodeURIComponent(name).trim().toLowerCase())
    .maybeSingle();

  if (error) {
    console.error('Category read failed:', error);
    return NextResponse.json({ error: 'Could not load categories.' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'That domain is not listed.' }, { status: 404 });
  }

  const rows = (data.domain_categories ?? []) as { category_key: string }[];
  return NextResponse.json({ categories: rows.map((row) => row.category_key) });
}
