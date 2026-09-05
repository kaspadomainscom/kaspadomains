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
 */

export type WriteAction = 'list-domain' | 'vote' | 'update-links';

export function buildSignedMessage(input: {
  action: WriteAction;
  domain: string;
  publicKey: string;
  issuedAt: number;
}): string {
  return [
    'KaspaDomains request',
    `action: ${input.action}`,
    `domain: ${input.domain.toLowerCase()}`,
    `publicKey: ${input.publicKey.toLowerCase()}`,
    `issuedAt: ${input.issuedAt}`,
  ].join('\n');
}
