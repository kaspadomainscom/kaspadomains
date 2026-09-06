import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { REQUIRED_SCHEMA_VERSION } from '@/lib/database.types';
import {
  isProfileWriteAction,
  parseProfileRevision,
  PROFILE_WRITE_NONCE_TTL_MS,
} from '@/lib/profileWrite';
import { getSupabaseAdminClient, isSupabaseWritable } from '@/lib/supabase';
import {
  extractPayload,
  requireDomainOwner,
  VerificationError,
} from '@/lib/server/verifyRequest';

export const runtime = 'nodejs';

function setupUnavailable(error?: { code?: string } | null) {
  return error?.code === 'PGRST202' ||
    error?.code === 'PGRST204' ||
    error?.code === 'PGRST205' ||
    error?.code === '42P01' ||
    error?.code === '42703';
}

/**
 * Issue (or return) the one active write token for a loaded profile snapshot.
 *
 * This deliberately is not a security-definer RPC. The service-role client is
 * used only after the route has verified a signature from the current KNS
 * owner, which avoids exposing a browser-callable token-minting surface.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ name: string }> }
) {
  if (!isSupabaseWritable) {
    return NextResponse.json(
      { error: 'Editing this profile is temporarily unavailable.' },
      { status: 503 }
    );
  }

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return NextResponse.json({ error: 'Expected a JSON object.' }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  if (!isProfileWriteAction(body.action)) {
    return NextResponse.json({ error: 'Choose a valid profile update action.' }, { status: 400 });
  }

  const profileRevision = parseProfileRevision(body.profileRevision);
  if (profileRevision === null) {
    return NextResponse.json({ error: 'A valid loaded profile revision is required.' }, { status: 400 });
  }

  const { name } = await context.params;
  let domain: string;
  try {
    domain = decodeURIComponent(name);
  } catch {
    return NextResponse.json({ error: 'The domain name is malformed.' }, { status: 400 });
  }

  let verified;
  try {
    verified = await requireDomainOwner({
      // This is intentionally distinct from either write action. A signature
      // authorising token issuance cannot be replayed as the replacement.
      action: 'issue-profile-write',
      domain,
      publicKey: String(body.publicKey ?? ''),
      issuedAt: Number(body.issuedAt ?? 0),
      signature: String(body.signature ?? ''),
      payload: extractPayload(body),
    });
  } catch (error) {
    if (error instanceof VerificationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  const supabase = getSupabaseAdminClient();

  // A schema-version failure must happen before any token is minted. A missing
  // nonce table or new RPC is deployment setup work, not a generic 500 users
  // can act on by retrying.
  const { data: version, error: versionError } = await supabase.rpc(
    'kaspadomains_schema_version'
  );
  if (versionError || Number(version ?? 0) < REQUIRED_SCHEMA_VERSION) {
    console.error('Profile-write schema version check failed:', versionError);
    return NextResponse.json(
      { error: 'This deployment is not finished setting up profile editing.' },
      { status: 503 }
    );
  }

  const { data: listedDomain, error: domainError } = await supabase
    .from('domains')
    .select('id, profile_revision')
    .eq('name', verified.domain)
    .maybeSingle();

  if (domainError) {
    console.error('Profile-write domain lookup failed:', domainError);
    return NextResponse.json(
      {
        error: setupUnavailable(domainError)
          ? 'This deployment is not finished setting up profile editing.'
          : 'Could not prepare this profile update.',
      },
      { status: setupUnavailable(domainError) ? 503 : 500 }
    );
  }
  if (!listedDomain) {
    return NextResponse.json({ error: 'That domain is not listed.' }, { status: 404 });
  }

  const currentRevision = parseProfileRevision(listedDomain.profile_revision);
  if (currentRevision === null) {
    console.error('Invalid stored profile revision:', listedDomain.profile_revision);
    return NextResponse.json(
      { error: 'This deployment has an invalid profile revision. Please contact support.' },
      { status: 503 }
    );
  }
  if (currentRevision !== profileRevision) {
    return NextResponse.json(
      { error: 'This profile changed in another tab. Reload before saving.' },
      { status: 409 }
    );
  }

  const now = new Date();
  // Clean the matching expired row before inserting. Do not delete a live one:
  // replaying a signed issuance request must return the same still-valid token,
  // not invalidate the owner’s pending save.
  const { error: expiredDeleteError } = await supabase
    .from('profile_write_nonces')
    .delete()
    .eq('domain_id', listedDomain.id)
    .eq('action', body.action)
    .eq('signer', verified.signerAddress)
    .eq('profile_revision', profileRevision)
    .lte('expires_at', now.toISOString());

  if (expiredDeleteError) {
    console.error('Failed to clear expired profile-write nonce:', expiredDeleteError);
    return NextResponse.json(
      {
        error: setupUnavailable(expiredDeleteError)
          ? 'This deployment is not finished setting up profile editing.'
          : 'Could not prepare this profile update.',
      },
      { status: setupUnavailable(expiredDeleteError) ? 503 : 500 }
    );
  }

  const expiresAt = new Date(now.getTime() + PROFILE_WRITE_NONCE_TTL_MS).toISOString();
  const { error: insertError } = await supabase.from('profile_write_nonces').insert({
    nonce: randomUUID(),
    domain_id: listedDomain.id,
    action: body.action,
    signer: verified.signerAddress,
    profile_revision: profileRevision,
    expires_at: expiresAt,
  });

  // A concurrent/replayed issuance sees the unique tuple and then selects the
  // existing nonce below. That is expected; any other failure is not.
  if (insertError && insertError.code !== '23505') {
    console.error('Failed to issue profile-write nonce:', insertError);
    return NextResponse.json(
      {
        error: setupUnavailable(insertError)
          ? 'This deployment is not finished setting up profile editing.'
          : 'Could not prepare this profile update.',
      },
      { status: setupUnavailable(insertError) ? 503 : 500 }
    );
  }

  const { data: issued, error: issuedError } = await supabase
    .from('profile_write_nonces')
    .select('nonce, expires_at')
    .eq('domain_id', listedDomain.id)
    .eq('action', body.action)
    .eq('signer', verified.signerAddress)
    .eq('profile_revision', profileRevision)
    .gt('expires_at', now.toISOString())
    .maybeSingle();

  if (issuedError || !issued) {
    console.error('Could not read issued profile-write nonce:', issuedError);
    return NextResponse.json(
      {
        error: setupUnavailable(issuedError)
          ? 'This deployment is not finished setting up profile editing.'
          : 'Could not prepare this profile update.',
      },
      { status: setupUnavailable(issuedError) ? 503 : 500 }
    );
  }

  return NextResponse.json(
    { nonce: issued.nonce, expiresAt: issued.expires_at, profileRevision },
    { headers: { 'cache-control': 'no-store' } }
  );
}
