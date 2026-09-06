'use client';

import { useState, useRef } from 'react';
import { useToast } from '@/components/ToastProvider';
import { prepareProfileWrite, signedFetch, readError } from '@/lib/signedFetch';
import { parseProfileRevision } from '@/lib/profileWrite';
import type { DomainLink } from './useGetDomainLinks';

export function useUpdateDomainLinks() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSubmitting = useRef(false);

  const { addToast } = useToast();

  const updateLinks = async (
    domain: string,
    links: DomainLink[],
    profileRevision: number
  ): Promise<{ links: DomainLink[]; profileRevision: number } | null> => {
    if (isSubmitting.current) return null;

    const cleanLinks = links
      .map((l) => ({ name: l.name.trim(), url: l.url.trim() }))
      .filter((l) => l.name && l.url);

    setError(null);
    isSubmitting.current = true;
    setIsLoading(true);

    try {
      addToast(`Saving resources for "${domain}"...`);

      // This first signature proves the current owner wants a token for the
      // revision rendered in this editor. It is intentionally separate from
      // the replacement signature below: one token is consumed by one write.
      const prepared = await prepareProfileWrite({
        action: 'update-links',
        domain,
        profileRevision,
      });

      const response = await signedFetch({
        action: 'update-links',
        domain,
        path: `/api/domains/${encodeURIComponent(domain)}/links`,
        method: 'PUT',
        body: {
          links: cleanLinks,
          nonce: prepared.nonce,
          profileRevision: prepared.profileRevision,
        },
      });

      if (!response.ok) {
        throw new Error(await readError(response, 'Failed to save resources.'));
      }

      const body = (await response.json()) as {
        links?: DomainLink[];
        profileRevision?: unknown;
      };
      const nextProfileRevision = parseProfileRevision(body.profileRevision);
      if (nextProfileRevision === null) {
        throw new Error('The resources were saved, but the editor must reload before another change.');
      }

      addToast(`Resources saved for "${domain}".`, 'success');
      return { links: body.links ?? cleanLinks, profileRevision: nextProfileRevision };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save resources.';
      addToast(msg, 'error');
      setError(msg);
      return null;
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
