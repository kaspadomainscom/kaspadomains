/**
 * The exact payload format for signed write requests — the pure half.
 *
 * ## Why this is separate from `signedMessage.ts`
 *
 * Purely so it can be tested, which is the same reason `paymentCheck.ts` and
 * `paymentIntentToken.ts` exist. The test runner strips types but resolves
 * neither `@/` aliases nor extensionless relative imports, so a module is only
 * testable if it imports nothing but Node builtins. `signedMessage.ts` imports
 * `getKnsSignatureScope` from the runtime module, and that single import made
 * the entire signing format — the thing the browser signs and the server
 * verifies — impossible to cover.
 *
 * So the format lives here and takes the KNS scope as an argument, and
 * `signedMessage.ts` is the thin wrapper that supplies the real one. Callers do
 * not change and there is still exactly one definition of the format: a test can
 * pass any scope, but only the wrapper is used in the app, so the two sides
 * cannot drift.
 *
 * ## What the format is defending against
 *
 * The signature used to cover only the action, domain, key and timestamp — not
 * the request body. The message format is public, so any website could have
 * prompted a visitor to sign this innocuous-looking string and posted it to the
 * API with a body of its own choosing: different links on someone's public
 * profile, different categories, a different payment reference. Hashing the body
 * into the message means a signature authorises one specific request.
 */

export type WriteAction =
  | 'list-domain'
  | 'vote'
  | 'update-links'
  | 'update-categories'
  // A separate owner-verified request that issues a one-time token for either
  // bulk profile replacement. It must not be interchangeable with the write
  // itself: a token-issuance signature has a different safety contract.
  | 'issue-profile-write'
  // A no-fee dry run of 'list-domain' or 'vote'. A distinct action so a
  // preflight signature can never be replayed as the write it was previewing.
  | 'preflight';

/**
 * Deterministic JSON: object keys sorted, array order preserved. Both sides must
 * produce byte-identical output or every request fails verification, so this
 * deliberately avoids anything environment-dependent.
 *
 * Array order is preserved rather than sorted because it is meaningful — link
 * order is what the owner chose — while object key order is not.
 */
function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
}

/**
 * SHA-256 of the canonical form, hex encoded. Uses Web Crypto, which exists in
 * both the browser and Node 18+, so the same code runs on both sides.
 */
export async function digestPayload(payload: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(payload ?? {}));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export type SignedMessageInput = {
  action: WriteAction;
  domain: string;
  publicKey: string;
  issuedAt: number;
  /** Hex SHA-256 of the request body, from `digestPayload()`. */
  payloadDigest: string;
};

/**
 * Build the message, given the KNS scope line to domain-separate it with.
 *
 * The scope is a parameter rather than an import so this module stays testable;
 * `signedMessage.ts` supplies the real value and is the only thing the app
 * calls.
 */
export function buildSignedMessageWithScope(
  input: SignedMessageInput & { knsScope: string }
): string {
  return [
    'KaspaDomains request',
    `action: ${input.action}`,
    `domain: ${input.domain.toLowerCase()}`,
    `publicKey: ${input.publicKey.toLowerCase()}`,
    `issuedAt: ${input.issuedAt}`,
    // Domain-separate signatures from any future KNS network migration. The
    // current L1 covenant target is testnet-only but not active, so signed
    // directory writes remain explicitly tied to mainnet KNS ownership.
    input.knsScope,
    `payload: ${input.payloadDigest}`,
  ].join('\n');
}

/** Fields that make up the signed envelope rather than the request payload. */
export const ENVELOPE_FIELDS = ['domain', 'publicKey', 'issuedAt', 'signature'] as const;

/**
 * The payload a signature must cover: everything in the request body except the
 * envelope. Used identically on both sides so the digests match.
 *
 * The direction matters. This is a deny-list, so a field added to a request in
 * future is covered by the signature automatically. An allow-list would leave
 * every new field unauthenticated until somebody remembered to add it — which is
 * exactly the shape of the bug that made the links array forgeable.
 */
export function extractPayload(body: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if ((ENVELOPE_FIELDS as readonly string[]).includes(key)) continue;
    payload[key] = value;
  }
  return payload;
}
