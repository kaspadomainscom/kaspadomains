// src/lib/signedFetch.ts
import { buildSignedMessage, type WriteAction } from './signedMessage';
import { TREASURY_ADDRESS, isFeeCollectionConfigured } from './fees';

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
  sendKaspa?: (toAddress: string, sompi: number) => Promise<string>;
};

/**
 * Ask the wallet to pay a fee on Kaspa L1, returning the transaction id.
 *
 * This is the one place in the app that moves real funds, so it is deliberately
 * small and does nothing clever: no retries (a retry could pay twice), and the
 * amount and destination come from `lib/fees.ts` rather than being passed in
 * from a call site that might get them wrong.
 *
 * The server re-checks the resulting transaction against the same treasury
 * address and amount, so a tampered client here just produces a payment that
 * fails verification -- it cannot mint a free listing.
 */
export async function payFee(sompi: bigint): Promise<string> {
  const kasware = getKaswareL1();
  if (!kasware?.sendKaspa) {
    throw new Error('Kasware is not available, so the fee cannot be paid.');
  }
  if (!isFeeCollectionConfigured) {
    // Covers both "unset" and "set to something malformed". Never fall through
    // to sending funds at an address that failed its shape check.
    throw new Error('No valid fee address is configured, so this action is unavailable.');
  }

  // Kasware takes sompi as a JS number. Guard the conversion rather than
  // silently losing precision on an amount of money.
  const amount = Number(sompi);
  if (!Number.isSafeInteger(amount)) {
    throw new Error('Fee amount is out of range.');
  }

  return kasware.sendKaspa(TREASURY_ADDRESS, amount);
}

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
