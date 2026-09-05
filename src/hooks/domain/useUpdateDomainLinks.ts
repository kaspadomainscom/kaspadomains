'use client';

import { useState, useRef } from 'react';
import { contracts } from '@/lib/contracts';
import { kasplexClient } from '@/lib/viemClient';
import { createKaswareEvmClient } from '@/lib/kaswareEvm';
import { useToast } from '@/components/ToastProvider';
import { isSupabaseConfigured } from '@/lib/supabase';
import { signedFetch, readError } from '@/lib/signedFetch';
import type { DomainLink } from './useGetDomainLinks';

export function useUpdateDomainLinks() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSubmitting = useRef(false);

  const { addToast } = useToast();

  const updateLinks = async (
    domain: string,
    // Only needed for the on-chain path. The database path signs with the
    // Kaspa L1 key instead, so requiring an EVM account there would lock out
    // an owner who has only L1 connected.
    account: `0x${string}` | null,
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
      if (isSupabaseConfigured) {
        addToast(`Saving resources for "${domain}"...`);

        const response = await signedFetch({
          action: 'update-links',
          domain,
          path: `/api/domains/${encodeURIComponent(domain)}/links`,
          method: 'PUT',
          body: { links: cleanLinks },
        });

        if (!response.ok) {
          throw new Error(await readError(response, 'Failed to save resources.'));
        }

        addToast(`Resources saved for "${domain}".`, 'success');
        return true;
      }

      if (!account) {
        throw new Error('Kasware (Kasplex) is not connected.');
      }

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
