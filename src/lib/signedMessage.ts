// src/lib/signedMessage.ts
/**
 * The signed-message format as the app uses it: the pure format from
 * `signedMessageFormat.ts`, with the real KNS scope supplied.
 *
 * This lives apart from the verification code on purpose. The server-side
 * verifier depends on `kaspa-wasm`, and if the client imported the verifier just
 * to reach this builder, the WASM module would be pulled into the browser bundle
 * -- which both breaks the build and ships verification code to the one place
 * whose verification results cannot be trusted.
 *
 * The format itself lives one module further down so it can be tested: this file
 * imports the runtime, and the test runner cannot load anything that imports a
 * relative module. Keeping the format in one place is still the point -- if the
 * client and server ever built the string differently, every request would fail
 * verification with no obvious cause -- and it still is one place. Only the
 * wrapper is used in the app, so the two sides cannot drift.
 */

import { getKnsSignatureScope } from './kaspaDomainRuntime';
import { buildSignedMessageWithScope, type SignedMessageInput } from './signedMessageFormat';

export {
  digestPayload,
  extractPayload,
  ENVELOPE_FIELDS,
  type WriteAction,
  type SignedMessageInput,
} from './signedMessageFormat';

/** The message both sides sign and verify, scoped to the configured KNS network. */
export function buildSignedMessage(input: SignedMessageInput): string {
  return buildSignedMessageWithScope({ ...input, knsScope: getKnsSignatureScope() });
}
