// src/lib/server/verifyRequest.ts
import { PublicKey, verifyMessage } from 'kaspa-wasm';
import { buildSignedMessage, type WriteAction } from '../signedMessage';

export { buildSignedMessage };
export type { WriteAction };

/**
 * Server-side request verification for the Supabase write paths.
 *
 * ## The rule this enforces
 *
 * **Only the domain's owner may create or change its listing.** Listings used
 * to be gated by `KaspaDomainsRegistry`; now that they live in Postgres, this
 * file is the only thing enforcing that, so it is worth being exact about how.
 *
 * The chain of reasoning, every link of which is checked here:
 *
 *   1. The caller supplies a Kaspa L1 public key, a signature, and a payload
 *      bound to the action, the domain and a timestamp.
 *   2. `verifyMessage` proves the signature was produced by the private key
 *      behind that public key. (Schnorr, via the rusty-kaspa WASM SDK -- not
 *      hand-rolled.)
 *   3. `PublicKey.toAddress()` derives the `kaspa:` address that public key
 *      controls.
 *   4. KNS is queried server-side for the domain's real owner address.
 *   5. **The derived address must equal the KNS owner.** If it does not, the
 *      request is refused.
 *
 * So a request only succeeds if the signer demonstrably holds the key that
 * owns the domain on KNS. This is the check that was impossible on Kasplex,
 * where the signer held an EVM key and KNS ownership sat with an L1 key, and
 * nothing bound the two.
 *
 * ## Failure direction
 *
 * If Kasware's message-signing convention ever differs from the SDK's,
 * verification **fails closed**: legitimate owners are rejected (visible,
 * annoying, fixable) rather than impostors admitted. That asymmetry is
 * deliberate. Do not "fix" a verification failure by relaxing this check.
 */

/** How long a signed request stays valid. Short, because replay is the risk. */
const MAX_AGE_MS = 5 * 60 * 1000;

export type SignedRequest = {
  action: WriteAction;
  domain: string;
  /** Kaspa L1 public key (compressed hex) the caller signs with. */
  publicKey: string;
  /** Millisecond epoch, signed, to bound replay. */
  issuedAt: number;
  signature: string;
};

export type VerifiedRequest = {
  domain: string;
  /** Proven: the caller controls the key for this `kaspa:` address. */
  signerAddress: string;
  /** Authoritative, read from KNS server-side. */
  knsOwner: string;
  /** True when signerAddress === knsOwner, i.e. the signer owns the domain. */
  isOwner: boolean;
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

function normalizeDomain(domain: string): string {
  const trimmed = domain.trim().toLowerCase();
  return trimmed.endsWith('.kas') ? trimmed : `${trimmed}.kas`;
}

/** Compare Kaspa addresses. They are case-sensitive bech32; normalise defensively. */
function sameAddress(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
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
 * Verify a signed write request, proving the signer controls a Kaspa key.
 * Throws VerificationError on any failure. Does NOT itself require ownership --
 * callers that need it use `requireDomainOwner` below.
 */
export async function verifySignedRequest(input: SignedRequest): Promise<VerifiedRequest> {
  const { action, publicKey, signature } = input;
  const domain = normalizeDomain(input.domain);

  if (!publicKey || !/^[0-9a-fA-F]{64,66}$/.test(publicKey.trim())) {
    throw new VerificationError('A valid Kaspa public key is required.', 400);
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

  const message = buildSignedMessage({
    action,
    domain,
    publicKey: publicKey.trim(),
    issuedAt: Number(input.issuedAt),
  });

  let signatureValid = false;
  let signerAddress: string;
  try {
    signatureValid = verifyMessage({ message, signature, publicKey: publicKey.trim() });
    signerAddress = new PublicKey(publicKey.trim()).toAddress('mainnet').toString();
  } catch {
    // A malformed key or signature lands here. Treat it as a failed check,
    // never as a pass.
    throw new VerificationError('Signature could not be verified.', 401);
  }

  if (!signatureValid) {
    throw new VerificationError('Signature does not match the supplied public key.', 401);
  }

  // Only after the signature checks out do we spend a network call on KNS.
  const knsOwner = await fetchKnsOwner(domain);

  return {
    domain,
    signerAddress,
    knsOwner,
    isOwner: sameAddress(signerAddress, knsOwner),
  };
}

/**
 * Verify, and additionally require that the signer is the domain's owner.
 * Use this for anything that creates or mutates a listing.
 */
export async function requireDomainOwner(input: SignedRequest): Promise<VerifiedRequest> {
  const verified = await verifySignedRequest(input);

  if (!verified.isOwner) {
    throw new VerificationError(
      `Only the owner of ${verified.domain} can do that. This wallet does not hold it on KNS.`,
      403
    );
  }

  return verified;
}
