// src/lib/signedFetch.ts
import { buildSignedMessage, digestPayload, type WriteAction } from './signedMessage';
import { TREASURY_ADDRESS, isFeeCollectionConfigured } from './fees';
import {
  parseProfileRevision,
  type ProfileWriteAction,
} from './profileWrite';
import { decidePaidWrite, type PaidWriteAttempt } from './paidWriteRetry';

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

/**
 * A request that has been signed and is ready to send -- as many times as
 * necessary.
 *
 * Signing and sending are separate because a paid write may have to be resent:
 * the wallet returns a payment id as soon as the transaction is submitted, so
 * the write frequently arrives before the network has accepted it. Re-running
 * `signedFetch` for each attempt would work, but it would prompt the wallet for
 * a signature every time, which is indistinguishable to the user from something
 * having gone wrong.
 *
 * One signature covers all attempts. It is valid for five minutes, comfortably
 * more than `RETRY_DEADLINE_MS`.
 */
export type SignedRequest = {
  path: string;
  method: 'POST' | 'PUT';
  body: Record<string, unknown>;
};

export async function signRequest(input: {
  action: WriteAction;
  domain: string;
  path: string;
  method?: 'POST' | 'PUT';
  body?: Record<string, unknown>;
}): Promise<SignedRequest> {
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

  // The signature covers the body, not just the envelope, so it authorises this
  // exact request rather than any request of this shape. The server recomputes
  // the same digest from what it receives.
  const payload = input.body ?? {};
  const payloadDigest = await digestPayload(payload);

  const message = buildSignedMessage({
    action: input.action,
    domain: input.domain,
    publicKey,
    issuedAt,
    payloadDigest,
  });

  const signature = await kasware.signMessage(message);

  return {
    path: input.path,
    method: input.method ?? 'POST',
    body: {
      ...payload,
      domain: input.domain,
      publicKey,
      issuedAt,
      signature,
    },
  };
}

function send(signed: SignedRequest): Promise<Response> {
  return fetch(signed.path, {
    method: signed.method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(signed.body),
  });
}

/** Sign and send once. For everything that has not cost the user anything. */
export async function signedFetch(input: {
  action: WriteAction;
  domain: string;
  path: string;
  method?: 'POST' | 'PUT';
  body?: Record<string, unknown>;
}): Promise<Response> {
  return send(await signRequest(input));
}

/**
 * Send a write whose fee has **already been paid**, retrying the same request
 * until it lands or the deadline passes.
 *
 * Retrying here is not an optimisation, it is the correctness property. The
 * money has already moved; the alternative to retrying is telling the user to
 * "try again", which re-runs the flow from the preflight and charges them
 * again. So this resends the *identical* request -- same signature, same intent,
 * same payment id -- and never asks the wallet for anything.
 *
 * `onWait` reports each pause so the UI can say what is happening. A silent
 * ninety-second wait after a wallet prompt reads as a hang, and a user who
 * reloads at that point is back to the double payment this exists to prevent.
 */
export async function sendPaidWrite(input: {
  signed: SignedRequest;
  fallbackMessage: string;
  onWait?: (info: { attempt: number; afterMs: number }) => void;
}): Promise<{ outcome: 'success' | 'already-done'; message?: string }> {
  const startedAt = Date.now();

  for (let attempt = 1; ; attempt += 1) {
    let attemptResult: PaidWriteAttempt;
    try {
      const response = await send(input.signed);
      if (response.ok) {
        attemptResult = { transport: 'ok', ok: true, status: response.status, body: {} };
      } else {
        const body = await readErrorBody(response);
        // No readable body means we never got this API's verdict, so treat it
        // like a connection that dropped rather than like a refusal.
        attemptResult = body
          ? { transport: 'ok', ok: false, status: response.status, body }
          : { transport: 'failed' };
      }
    } catch {
      // The request never completed. It may still have been executed, which is
      // why giving up here would be wrong -- see `decidePaidWrite`.
      attemptResult = { transport: 'failed' };
    }

    const decision = decidePaidWrite({
      attemptResult,
      attempt,
      elapsedMs: Date.now() - startedAt,
      fallbackMessage: input.fallbackMessage,
    });

    switch (decision.kind) {
      case 'success':
        return { outcome: 'success' };
      case 'already-done':
        return { outcome: 'already-done', message: decision.message };
      case 'failed':
        throw new Error(decision.message);
      case 'retry':
        input.onWait?.({ attempt, afterMs: decision.afterMs });
        await new Promise((resolve) => setTimeout(resolve, decision.afterMs));
    }
  }
}

type ErrorBody = { error?: string; retryable?: boolean; code?: string };

/**
 * Pull the server's error body out of a failed response, or `null` if there was
 * no readable body.
 *
 * `null` rather than `{}` on purpose, and the distinction is load-bearing for
 * paid writes. An error that will not parse as JSON is not this API answering
 * with no detail -- it is a proxy's 502 page, a gateway timeout, a truncated
 * response. Those are the transient infrastructure failures a paid write most
 * needs to retry, and flattening them into an empty body would mark them
 * `retryable: undefined` and stop the loop, stranding a user who has paid.
 */
async function readErrorBody(response: Response): Promise<ErrorBody | null> {
  try {
    return ((await response.json()) ?? {}) as ErrorBody;
  } catch {
    return null;
  }
}

/** Pull the server's error message out of a failed response. */
export async function readError(response: Response, fallback: string): Promise<string> {
  return (await readErrorBody(response))?.error || fallback;
}

/**
 * Obtain a short-lived, owner-bound token before a bulk profile replacement.
 *
 * The revision is the one rendered with the profile data, not a fresh read at
 * save time: refreshing it here would let a stale tab overwrite a change it
 * never saw. The server verifies ownership and rejects a revision that has
 * changed since that rendered snapshot.
 */
export async function prepareProfileWrite(input: {
  action: ProfileWriteAction;
  domain: string;
  profileRevision: number;
}): Promise<{ nonce: string; profileRevision: number; expiresAt: string }> {
  const response = await signedFetch({
    action: 'issue-profile-write',
    domain: input.domain,
    path: `/api/domains/${encodeURIComponent(input.domain)}/write-nonce`,
    body: { action: input.action, profileRevision: input.profileRevision },
  });

  if (!response.ok) {
    throw new Error(await readError(response, 'Could not prepare this profile update.'));
  }

  const body = (await response.json()) as {
    nonce?: unknown;
    profileRevision?: unknown;
    expiresAt?: unknown;
  };
  const profileRevision = parseProfileRevision(body.profileRevision);
  if (
    typeof body.nonce !== 'string' ||
    body.nonce.length === 0 ||
    profileRevision !== input.profileRevision ||
    typeof body.expiresAt !== 'string'
  ) {
    throw new Error('The server did not prepare a safe profile update. Nothing was saved.');
  }

  return { nonce: body.nonce, profileRevision, expiresAt: body.expiresAt };
}

/**
 * Ask the server whether it can actually do this, before any money moves.
 *
 * Returns a short-lived intent that the write request must carry. Everything
 * that can fail -- write-readiness, KNS ownership, whether the domain is already
 * listed or already voted for, whether the categories are real -- is checked
 * here, for free.
 *
 * Call this before `payFee`, always. The wallet prompt should be the *last*
 * uncertain step, not the first: a fee paid into a request the server was always
 * going to refuse is money the user does not get back.
 */
export async function preflight(input: {
  action: 'list-domain' | 'vote';
  domain: string;
  categories?: string[];
}): Promise<{ intent: string; amountSompi: bigint }> {
  const response = await signedFetch({
    action: 'preflight',
    domain: input.domain,
    path: '/api/domains/preflight',
    body: input.categories
      ? { action: input.action, categories: input.categories }
      : { action: input.action },
  });

  if (!response.ok) {
    throw new Error(await readError(response, 'This action is not available right now.'));
  }

  const body = (await response.json()) as { intent?: string; amountSompi?: string };
  if (!body.intent || !body.amountSompi) {
    // Never fall through to charging on a malformed answer.
    throw new Error('The server did not confirm this action, so nothing was charged.');
  }

  return { intent: body.intent, amountSompi: BigInt(body.amountSompi) };
}
