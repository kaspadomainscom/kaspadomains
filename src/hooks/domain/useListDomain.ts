'use client';

import { useState, useRef } from 'react';
import { useToast } from '@/components/ToastProvider';
import { signRequest, sendPaidWrite, payFee, preflight } from '@/lib/signedFetch';
import { formatKas } from '@/lib/fees';
import { isListableDomain } from '@/lib/listDomainValidation';
import {
  clearPendingListing,
  findPendingListing,
  savePendingListing,
  type PendingListing,
} from '@/lib/pendingPaidWrite';

function getPendingStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    // A storage getter can throw in private browsing or when storage is blocked.
    // The in-memory pending record still makes a same-page retry safe.
    return null;
  }
}

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
  const pendingInMemory = useRef<PendingListing | null>(null);

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

    if (!isListableDomain(domain)) {
      addToast('Invalid domain. Must end with ".kas" and be at least 5 characters.', 'error');
      return null;
    }

    isSubmitting.current = true;
    setIsLoading(true);

    try {
      const storage = getPendingStorage();
      const pending =
        (pendingInMemory.current?.domain.trim().toLowerCase() === domain.trim().toLowerCase()
          ? pendingInMemory.current
          : null) ??
        (storage ? findPendingListing(storage, domain) : null);

      let intent: string;
      let paymentTxId: string;
      if (pending) {
        if (JSON.stringify(pending.categories) !== JSON.stringify(categories)) {
          throw new Error(
            'A payment is already pending for this domain. Retry with the categories you originally chose.'
          );
        }
        pendingInMemory.current = pending;
        intent = pending.intent;
        paymentTxId = pending.paymentTxId;
        addToast(`Resuming your paid listing for "${domain}" without charging again...`);
      } else {
        // Ask the server first. This is free, and it is what stops a user paying
        // into a request that was always going to be refused.
        addToast('Checking that this listing can go through...');
        const result = await preflight({
          action: 'list-domain',
          domain,
          categories,
        });

        addToast(`Confirm the ${formatKas(result.amountSompi)} listing fee in Kasware...`);
        paymentTxId = await payFee(result.amountSompi);
        intent = result.intent;

        // The final signMessage prompt can still be rejected after payment. Keep
        // the exact intent and txid so an explicit retry can finish this listing
        // without asking the wallet to pay a second time.
        const nextPending = { domain, categories, intent, paymentTxId };
        pendingInMemory.current = nextPending;
        if (storage) savePendingListing(storage, nextPending);
        addToast(`Payment sent. Listing "${domain}"...`);
      }

      // Signed once, then sent as many times as it takes. The wallet returns as
      // soon as the payment is submitted, so this first attempt usually arrives
      // before the network has accepted it -- and the fee is already gone, so
      // "try again later" is not something the user can safely act on.
      const signed = await signRequest({
        action: 'list-domain',
        domain,
        path: '/api/domains',
        body: { categories, paymentTxId, intent },
      });

      const { outcome } = await sendPaidWrite({
        signed,
        fallbackMessage: 'Could not create the listing.',
        onWait: ({ attempt }) => {
          // Say what is happening. Silence after a wallet prompt reads as a
          // hang, and a reload here is exactly the second payment this avoids.
          if (attempt === 1) {
            addToast('Waiting for the network to confirm your payment...');
          }
        },
      });

      addToast(
        outcome === 'already-done'
          ? `"${domain}" is already listed -- your payment went through.`
          : `"${domain}" listed successfully!`,
        'success'
      );
      pendingInMemory.current = null;
      if (storage) clearPendingListing(storage, domain);
      return domain;
    } catch (err) {
      const hasPendingPayment =
        pendingInMemory.current?.domain.trim().toLowerCase() === domain.trim().toLowerCase();
      const baseMessage = err instanceof Error ? err.message : 'Something went wrong.';
      const msg = hasPendingPayment
        ? `Payment sent, but the listing was not completed. ${baseMessage} Retry this listing to finish without paying again.`
        : baseMessage;
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
