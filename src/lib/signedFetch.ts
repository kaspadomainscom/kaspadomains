// src/lib/signedFetch.ts
import { BrowserProvider } from 'ethers';
import { getKaswareEvmProvider } from './kaswareEvm';
import { buildSignedMessage, type WriteAction } from './server/verifyRequest';

/**
 * Ask the wallet to sign a write request, then send it.
 *
 * The message format comes from the same builder the server verifies with, so
 * the two cannot drift apart -- if they did, every request would fail
 * verification with no obvious cause.
 *
 * Signing is a wallet prompt, not a transaction: it costs nothing and moves no
 * funds. It exists because listings are no longer gated by a contract, so the
 * server needs some proof that a request came from the wallet it claims.
 */
export async function signedFetch(input: {
  action: WriteAction;
  domain: string;
  address: string;
  path: string;
  method?: 'POST' | 'PUT';
  body?: Record<string, unknown>;
}): Promise<Response> {
  const provider = getKaswareEvmProvider();
  if (!provider) {
    throw new Error('Kasware is not available in this browser.');
  }

  const issuedAt = Date.now();
  const message = buildSignedMessage({
    action: input.action,
    domain: input.domain,
    address: input.address,
    issuedAt,
  });

  const signature = await new BrowserProvider(provider)
    .getSigner()
    .then((signer) => signer.signMessage(message));

  return fetch(input.path, {
    method: input.method ?? 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...input.body,
      domain: input.domain,
      address: input.address,
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
