'use client';

import { useState, useRef } from 'react';
import { contracts } from '@/lib/contracts';
import { kasplexClient } from '@/lib/viemClient';
import { stringToBytes32 } from '@/lib/utils';
import { createKaswareEvmClient } from '@/lib/kaswareEvm';
import { useToast } from '@/components/ToastProvider';

export function useSetDomainCategories() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSubmitting = useRef(false);

  const { addToast } = useToast();

  const setCategories = async (
    domain: string,
    account: `0x${string}`,
    categories: string[]
  ) => {
    if (isSubmitting.current) return;
    if (categories.length === 0) {
      addToast('Select at least one category before listing.', 'error');
      return;
    }

    setError(null);
    isSubmitting.current = true;
    setIsLoading(true);

    try {
      let domainHash: bigint;
      try {
        domainHash = (await kasplexClient.readContract({
          address: contracts.KaspaDomainsRegistry.address,
          abi: contracts.KaspaDomainsRegistry.abi,
          functionName: 'domainHashPublic',
          args: [domain],
        })) as bigint;
      } catch {
        // Registry contract unreachable at its configured address (see
        // docs/BUGS.md) -- fail with a clear, honest message instead of the
        // raw "returned no data" decode error.
        throw new Error('Category assignment is temporarily unavailable. Please try again later.');
      }

      const walletClient = createKaswareEvmClient(account);
      const categoryBytes32 = categories.map(stringToBytes32);

      addToast(`Assigning categories to "${domain}"...`);

      const hash = await walletClient.writeContract({
        address: contracts.DomainCategoriesStorage.address,
        abi: contracts.DomainCategoriesStorage.abi,
        functionName: 'updateCategories',
        args: [domainHash, categoryBytes32],
        account,
      });

      const receipt = await kasplexClient.waitForTransactionReceipt({ hash });

      if (receipt.status !== 'success') {
        throw new Error(`Assigning categories to "${domain}" was reverted on-chain.`);
      }

      addToast(`Categories assigned to "${domain}".`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to assign categories.';
      addToast(
        `"${domain}" was listed, but assigning categories failed: ${msg}`,
        'error'
      );
      setError(msg);
    } finally {
      isSubmitting.current = false;
      setIsLoading(false);
    }
  };

  return {
    setCategories,
    isLoading,
    error,
  };
}
