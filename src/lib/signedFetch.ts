// src/lib/signedFetch.ts
import { buildSignedMessage, type WriteAction } from './signedMessage';

/**
 * Ask Kasware to sign a write request with the user's **Kaspa L1 key**, then
 * send it.
 *
 * The L1 key matters: it is the key that owns the domain on KNS, so signing
 * with it is what lets the server prove the requester is the owner. Signing
 * with the Kasplex EVM key would prove control of a different keypair
 * entirely, which is the gap this replaced.
 *
 * The message comes from the same builder the server verifies with, so the two
 * cannot drift apart -- if they did, every request would fail verification with
 * no obvious cause.
 *
 * Signing is a wallet prompt, not a transaction: it costs nothing and moves no
 * funds.
 */

type KaswareL1 = {
  getPublicKey?: () => Promise<string>;
  signMessage?: (message: string) => Promise<string>;
  requestAccounts?: () => Promise<string[]>;
};

function getKaswareL1(): KaswareL1 | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { kasware?: KaswareL1 };
  return w.kasware ?? null;
}

export async function signedFetch(input: {
  action: WriteAction;
  domain: string;
  path: string;
  method?: 'POST' | 'PUT';
  body?: Record<string, unknown>;
}): Promise<Response> {
  const kasware = getKaswareL1();
  if (!kasware?.signMessage || !kasware?.getPublicKey) {
    throw new Error(
      'Kasware is not available. Install or unlock it to prove you own this domain.'
    );
  }

  // Make sure the wallet is unlocked and authorised before asking for a key.
  if (kasware.requestAccounts) {
    await kasware.requestAccounts();
  }

  const publicKey = (await kasware.getPublicKey()).trim();
  const issuedAt = Date.now();
  const message = buildSignedMessage({
    action: input.action,
    domain: input.domain,
    publicKey,
    issuedAt,
  });

  const signature = await kasware.signMessage(message);

  return fetch(input.path, {
    method: input.method ?? 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...input.body,
      domain: input.domain,
      publicKey,
      issuedAt,
      signature,
    }),
  });
}

/** Pull the server's error message out of a failed response. */
export async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body?.error || fallback;
  } catch {
    return fallback;
  }
}
