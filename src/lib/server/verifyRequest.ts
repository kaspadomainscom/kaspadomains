// src/lib/server/verifyRequest.ts
import { verifyMessage } from 'ethers';

/**
 * Server-side request verification for the Supabase write paths.
 *
 * ## What this proves, and what it does not
 *
 * Listings used to be gated by `KaspaDomainsRegistry`. Now that they live in
 * Postgres, nothing enforces ownership except this file, so it is worth being
 * exact about its guarantees:
 *
 *   PROVEN  — the caller controls the Kasplex (EVM) address they claim. The
 *             signature is checked with ethers' `verifyMessage`, and the signed
 *             payload is bound to the domain, the action, and a timestamp, so
 *             a signature for one domain cannot be replayed for another.
 *
 *   PROVEN  — who KNS says owns the domain. That is fetched here, server-side,
 *             and never taken from the request body, so a caller cannot assert
 *             ownership by lying in the payload.
 *
 *   NOT PROVEN — that those two are the same person. The EVM key and the Kaspa
 *             L1 key are different keypairs. Binding them needs a Kaspa L1
 *             message signature verified server-side, which means reimplementing
 *             Kaspa's personal-message hashing and address encoding; doing that
 *             untested (no Kasware extension is reachable from CI) risks a
 *             verifier that accepts everything, which is worse than an honest
 *             gap. See docs/GAPS.md.
 *
 * Consequence, stated plainly: someone who knows a domain's KNS owner address
 * can create a listing row for a domain they do not own. They cannot make it
 * *say* they own it -- `owner` always comes from KNS -- but they can occupy the
 * row. That is why rows are written with `ownership_verified = false` and why
 * the UI must show that state rather than implying a verified listing.
 */

/** How long a signed request stays valid. Short, because replay is the risk. */
const MAX_AGE_MS = 5 * 60 * 1000;

export type WriteAction = 'list-domain' | 'vote' | 'update-links';

export type SignedRequest = {
  action: WriteAction;
  domain: string;
  /** EVM address the caller claims, and signs with. */
  address: string;
  /** Millisecond epoch, signed, to bound replay. */
  issuedAt: number;
  signature: string;
};

export type VerifiedRequest = {
  /** Proven: the caller controls this EVM address. */
  submittedBy: string;
  /** Authoritative: the Kaspa L1 address KNS reports as owner. */
  knsOwner: string;
  domain: string;
};

export class VerificationError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'VerificationError';
  }
}

/**
 * The exact string the client must sign. Keep this in one place: if the client
 * and server ever build it differently, every request fails verification.
 */
export function buildSignedMessage(input: {
  action: WriteAction;
  domain: string;
  address: string;
  issuedAt: number;
}): string {
  return [
    'KaspaDomains request',
    `action: ${input.action}`,
    `domain: ${input.domain.toLowerCase()}`,
    `address: ${input.address.toLowerCase()}`,
    `issuedAt: ${input.issuedAt}`,
  ].join('\n');
}

function normalizeDomain(domain: string): string {
  const trimmed = domain.trim().toLowerCase();
  return trimmed.endsWith('.kas') ? trimmed : `${trimmed}.kas`;
}

/** Look up the authoritative owner from KNS. Never trust a client-supplied owner. */
export async function fetchKnsOwner(domain: string): Promise<string> {
  const normalized = normalizeDomain(domain);

  let response: Response;
  try {
    response = await fetch(
      `https://api.knsdomains.org/mainnet/api/v1/${encodeURIComponent(normalized)}/owner`,
      { headers: { accept: 'application/json' } }
    );
  } catch (error) {
    // A KNS outage must not be treated as "nobody owns this", which would let
    // anyone list any domain the moment KNS is unreachable.
    throw new VerificationError(
      `Could not reach KNS to confirm ownership of ${normalized}: ${(error as Error).message}`,
      503
    );
  }

  if (!response.ok) {
    throw new VerificationError(
      `KNS returned ${response.status} for ${normalized}; refusing to assume ownership.`,
      503
    );
  }

  const body = (await response.json()) as {
    success?: boolean;
    data?: { owner?: string } | null;
    message?: string;
  };

  const owner = body?.data?.owner;
  if (!body?.success || !owner) {
    throw new VerificationError(
      body?.message || `${normalized} does not appear to be registered on KNS.`,
      404
    );
  }

  return owner;
}

/**
 * Verify a signed write request. Throws VerificationError with an appropriate
 * status on any failure; returns the proven facts on success.
 */
export async function verifySignedRequest(input: SignedRequest): Promise<VerifiedRequest> {
  const { action, address, signature } = input;
  const domain = normalizeDomain(input.domain);

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new VerificationError('A valid EVM address is required.', 400);
  }
  if (!signature) {
    throw new VerificationError('A signature is required.', 401);
  }

  const age = Date.now() - Number(input.issuedAt);
  if (!Number.isFinite(age)) {
    throw new VerificationError('issuedAt must be a millisecond timestamp.', 400);
  }
  // Allow a little clock skew in the future, but not a pre-signed request.
  if (age > MAX_AGE_MS || age < -60_000) {
    throw new VerificationError('This request has expired. Please sign again.', 401);
  }

  const expectedMessage = buildSignedMessage({
    action,
    domain,
    address,
    issuedAt: Number(input.issuedAt),
  });

  let recovered: string;
  try {
    recovered = verifyMessage(expectedMessage, signature);
  } catch {
    throw new VerificationError('Signature could not be verified.', 401);
  }

  if (recovered.toLowerCase() !== address.toLowerCase()) {
    throw new VerificationError('Signature does not match the claimed address.', 401);
  }

  // Only after the signature checks out do we spend a network call on KNS.
  const knsOwner = await fetchKnsOwner(domain);

  return { submittedBy: recovered.toLowerCase(), knsOwner, domain };
}
