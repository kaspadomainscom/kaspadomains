'use client';

import { useState, useRef } from 'react';
import { useToast } from '@/components/ToastProvider';
import { signedFetch, readError, payFee, preflight } from '@/lib/signedFetch';
import { formatKas } from '@/lib/fees';

/**
 * Create a listing.
 *
 * The order is the safety property, and it is the whole design:
 *
 *   1. **Preflight** -- signed, free, no side effects. Confirms the server can
 *      write, that KNS says this wallet owns the domain, that it is not already
 *      listed, and that the categories are real. Returns a short-lived payment
 *      intent and the price.
 *   2. **Pay** the amount the *server* quoted, not a local constant.
 *   3. **Sign and post**, carrying the intent.
 *
 * The wallet prompt is the last uncertain step. See
 * docs/mind/irreversible-action-checklist.md before changing any of this.
 *
 * The Kasplex contract path this used to fall back to was removed on
 * 2026-09-06: `KaspaDomainsRegistry` has no deployed code, so that branch could
 * only ever fail -- after taking a wallet connection and building a
 * value-carrying transaction.
 */
export function useListDomain() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSubmitting = useRef(false);

  const { addToast } = useToast();

  const listDomain = async (
    domain: string,
    categories: string[] = []
  ): Promise<string | null> => {
    if (isSubmitting.current) {
      addToast('Transaction already in progress. Please wait.');
      return null;
    }

    setError(null);

    if (!domain || !domain.endsWith('.kas') || domain.length < 5) {
      addToast('Invalid domain. Must end with ".kas" and be at least 5 characters.', 'error');
      return null;
    }

    isSubmitting.current = true;
    setIsLoading(true);

    try {
      // Ask the server first. This is free, and it is what stops a user paying
      // into a request that was always going to be refused.
      addToast('Checking that this listing can go through...');
      const { intent, amountSompi } = await preflight({
        action: 'list-domain',
        domain,
        categories,
      });

      addToast(`Confirm the ${formatKas(amountSompi)} listing fee in Kasware...`);
      const paymentTxId = await payFee(amountSompi);

      addToast(`Payment sent. Listing "${domain}"...`);

      const response = await signedFetch({
        action: 'list-domain',
        domain,
        path: '/api/domains',
        body: { categories, paymentTxId, intent },
      });

      if (!response.ok) {
        throw new Error(await readError(response, 'Could not create the listing.'));
      }

      addToast(`"${domain}" listed successfully!`, 'success');
      return domain;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      addToast(msg, 'error');
      setError(msg);
      return null;
    } finally {
      isSubmitting.current = false;
      setIsLoading(false);
    }
  };

  return {
    listDomain,
    isLoading,
    error,
  };
}
