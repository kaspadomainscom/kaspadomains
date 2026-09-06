// src/lib/signedMessage.ts
/**
 * The exact payload format for signed write requests, shared by the browser
 * (which signs it) and the server (which verifies it).
 *
 * This lives apart from the verification code on purpose. The server-side
 * verifier depends on `kaspa-wasm`, and if the client imported the verifier
 * just to reach this builder, the WASM module would be pulled into the browser
 * bundle -- which both breaks the build and ships verification code to the one
 * place whose verification results cannot be trusted.
 *
 * Keeping the format in one module is still the point: if the client and
 * server ever build the string differently, every request fails verification
 * with no obvious cause.
 *
 * ## Why the body is hashed into the message
 *
 * The signature used to cover only the action, domain, key and timestamp -- not
 * the request body. That left the body unauthenticated, and the message format
 * is public, so any website could have prompted a visitor to sign this
 * innocuous-looking string and then posted it to our API with a body of its own
 * choosing: different links on someone's public profile, different categories,
 * a different payment reference. Including a digest of the body closes that:
 * a signature now authorises one specific request and nothing else.
 */

import { getKnsSignatureScope } from './kaspaDomainRuntime';

export type WriteAction =
  | 'list-domain'
  | 'vote'
  | 'update-links'
  | 'update-categories'
  // A no-fee dry run of 'list-domain' or 'vote'. A distinct action so a
  // preflight signature can never be replayed as the write it was previewing.
  | 'preflight';

/**
 * Deterministic JSON: object keys sorted, array order preserved. Both sides
 * must produce byte-identical output or every request fails verification, so
 * this deliberately avoids anything environment-dependent.
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

export function buildSignedMessage(input: {
  action: WriteAction;
  domain: string;
  publicKey: string;
  issuedAt: number;
  /** Hex SHA-256 of the request body, from digestPayload(). */
  payloadDigest: string;
}): string {
  return [
    'KaspaDomains request',
    `action: ${input.action}`,
    `domain: ${input.domain.toLowerCase()}`,
    `publicKey: ${input.publicKey.toLowerCase()}`,
    `issuedAt: ${input.issuedAt}`,
    // Domain-separate signatures from any future KNS network migration. The
    // current L1 covenant target is testnet-only but not active, so signed
    // directory writes remain explicitly tied to mainnet KNS ownership.
    getKnsSignatureScope(),
    `payload: ${input.payloadDigest}`,
  ].join('\n');
}

/** Fields that make up the signed envelope rather than the request payload. */
export const ENVELOPE_FIELDS = ['domain', 'publicKey', 'issuedAt', 'signature'] as const;

/**
 * The payload a signature must cover: everything in the request body except the
 * envelope. Used identically on both sides so the digests match.
 */
export function extractPayload(body: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if ((ENVELOPE_FIELDS as readonly string[]).includes(key)) continue;
    payload[key] = value;
  }
  return payload;
}
