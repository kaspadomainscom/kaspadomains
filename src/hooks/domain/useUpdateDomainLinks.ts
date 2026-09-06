'use client';

import { useState, useRef } from 'react';
import { useToast } from '@/components/ToastProvider';
import { signedFetch, readError } from '@/lib/signedFetch';
import type { DomainLink } from './useGetDomainLinks';

export function useUpdateDomainLinks() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSubmitting = useRef(false);

  const { addToast } = useToast();

  const updateLinks = async (domain: string, links: DomainLink[]): Promise<boolean> => {
    if (isSubmitting.current) return false;

    const cleanLinks = links
      .map((l) => ({ name: l.name.trim(), url: l.url.trim() }))
      .filter((l) => l.name && l.url);

    setError(null);
    isSubmitting.current = true;
    setIsLoading(true);

    try {
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
