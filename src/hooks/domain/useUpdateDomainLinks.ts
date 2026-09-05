'use client';

import { useState, useRef } from 'react';
import { contracts } from '@/lib/contracts';
import { kasplexClient } from '@/lib/viemClient';
import { createKaswareEvmClient } from '@/lib/kaswareEvm';
import { useToast } from '@/components/ToastProvider';
import type { DomainLink } from './useGetDomainLinks';

export function useUpdateDomainLinks() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSubmitting = useRef(false);

  const { addToast } = useToast();

  const updateLinks = async (
    domain: string,
    account: `0x${string}`,
    links: DomainLink[]
  ): Promise<boolean> => {
    if (isSubmitting.current) return false;

    const cleanLinks = links
      .map((l) => ({ name: l.name.trim(), url: l.url.trim() }))
      .filter((l) => l.name && l.url);

    setError(null);
    isSubmitting.current = true;
    setIsLoading(true);

    try {
      const walletClient = createKaswareEvmClient(account);

      addToast(`Saving resources for "${domain}"...`);

      const hash = await walletClient.writeContract({
        address: contracts.DomainLinksStorage.address,
        abi: contracts.DomainLinksStorage.abi,
        functionName: 'updateLinks',
        args: [domain, cleanLinks],
        account,
      });

      addToast('Waiting for confirmation...');
      const receipt = await kasplexClient.waitForTransactionReceipt({ hash });

      if (receipt.status !== 'success') {
        throw new Error(`Saving resources for "${domain}" was reverted on-chain.`);
      }

      addToast(`Resources saved for "${domain}".`, 'success');
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save resources.';
      addToast(msg, 'error');
      setError(msg);
      return false;
    } finally {
      isSubmitting.current = false;
      setIsLoading(false);
    }
  };

  return {
    updateLinks,
    isLoading,
    error,
  };
}
