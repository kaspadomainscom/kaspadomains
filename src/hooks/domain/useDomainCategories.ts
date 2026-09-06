// src/hooks/domain/useDomainCategories.ts
"use client";

import { useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured } from '@/lib/supabase';
import { prepareProfileWrite, signedFetch, readError } from '@/lib/signedFetch';
import { parseProfileRevision } from '@/lib/profileWrite';

type Loaded = {
  domain: string;
  categories: string[] | null;
  // Coupled to the category snapshot the editor is displaying. This must never
  // be refreshed only when Save is clicked, or a stale tab could overwrite a
  // change it did not render.
  profileRevision: number | null;
  error: string | null;
};

/**
 * Read and replace the categories a listing belongs to.
 *
 * Categories used to be write-once: chosen at listing time and unchangeable
 * afterwards, because the Supabase migration never got an equivalent of
 * `DomainCategoriesStorage.updateCategories`. An owner who picked wrongly had
 * to pay to relist.
 *
 * Supabase-only. The contract path has its own `updateCategories`, but the
 * contracts it lives on have no deployed code (see docs/BUGS.md), so offering
 * the editor there would just be a button that always fails.
 *
 * `categories === null` means "not known" -- loading, unsupported, or failed --
 * and the editor must not treat it as "no categories", or saving would strip
 * a listing down to whatever the user happened to tick.
 */
export function useDomainCategories(domainName: string) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const domain = domainName.trim().toLowerCase();
  const enabled = isSupabaseConfigured && domain.length > 0;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    fetch(`/api/domains/${encodeURIComponent(domain)}/categories`)
      .then(async (response) => {
        if (cancelled) return;
        if (response.status === 404) {
          // A profile write needs a revision, which only a listed domain has.
          // Treating this as an editable empty set would produce a save request
          // that can never be made safely.
          setLoaded({
            domain,
            categories: null,
            profileRevision: null,
            error: 'That domain is not listed here yet.',
          });
          return;
        }
        if (!response.ok) {
          setLoaded({
            domain,
            categories: null,
            profileRevision: null,
            error: await readError(response, 'Could not load categories.'),
          });
          return;
        }
        const body = (await response.json()) as {
          categories?: string[];
          profileRevision?: unknown;
        };
        const profileRevision = parseProfileRevision(body.profileRevision);
        if (profileRevision === null) {
          setLoaded({
            domain,
            categories: null,
            profileRevision: null,
            error: 'Could not load the current profile revision.',
          });
          return;
        }
        setLoaded({
          domain,
          categories: body.categories ?? [],
          profileRevision,
          error: null,
        });
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setLoaded({ domain, categories: null, profileRevision: null, error: err.message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, domain]);

  const save = useCallback(
    async (categories: string[]): Promise<boolean> => {
      setSaving(true);
      setSaveError(null);
      try {
        const snapshot = loaded?.domain === domain ? loaded : null;
        const profileRevision = snapshot?.profileRevision ?? null;
        if (profileRevision === null) {
          setSaveError('Reload the current categories before saving.');
          return false;
        }

        const prepared = await prepareProfileWrite({
          action: 'update-categories',
          domain,
          profileRevision,
        });

        const response = await signedFetch({
          action: 'update-categories',
          domain,
          path: `/api/domains/${encodeURIComponent(domain)}/categories`,
          method: 'PUT',
          body: {
            categories,
            nonce: prepared.nonce,
            profileRevision: prepared.profileRevision,
          },
        });

        if (!response.ok) {
          setSaveError(await readError(response, 'Could not update categories.'));
          return false;
        }

        const body = (await response.json()) as {
          categories?: string[];
          profileRevision?: unknown;
        };
        const nextProfileRevision = parseProfileRevision(body.profileRevision);
        if (nextProfileRevision === null) {
          throw new Error('The categories were saved, but reload before another change.');
        }
        setLoaded({
          domain,
          categories: body.categories ?? categories,
          profileRevision: nextProfileRevision,
          error: null,
        });
        return true;
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'Could not update categories.');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [domain, loaded]
  );

  const fresh = loaded && loaded.domain === domain ? loaded : null;

  return {
    categories: fresh?.categories ?? null,
    profileRevision: fresh?.profileRevision ?? null,
    loading: enabled && !fresh,
    loadError: fresh?.error ?? null,
    supported: enabled,
    save,
    saving,
    saveError,
  };
}
