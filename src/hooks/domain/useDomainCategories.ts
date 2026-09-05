// src/hooks/domain/useDomainCategories.ts
"use client";

import { useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured } from '@/lib/supabase';
import { signedFetch, readError } from '@/lib/signedFetch';

type Loaded = { domain: string; categories: string[] | null; error: string | null };

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
          // Not listed here yet -- an empty set is the honest answer, not an error.
          setLoaded({ domain, categories: [], error: null });
          return;
        }
        if (!response.ok) {
          setLoaded({
            domain,
            categories: null,
            error: await readError(response, 'Could not load categories.'),
          });
          return;
        }
        const body = (await response.json()) as { categories?: string[] };
        setLoaded({ domain, categories: body.categories ?? [], error: null });
      })
      .catch((err: Error) => {
        if (!cancelled) setLoaded({ domain, categories: null, error: err.message });
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
        const response = await signedFetch({
          action: 'update-categories',
          domain,
          path: `/api/domains/${encodeURIComponent(domain)}/categories`,
          method: 'PUT',
          body: { categories },
        });

        if (!response.ok) {
          setSaveError(await readError(response, 'Could not update categories.'));
          return false;
        }

        const body = (await response.json()) as { categories?: string[] };
        setLoaded({ domain, categories: body.categories ?? categories, error: null });
        return true;
      } catch (err) {
        setSaveError((err as Error).message);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [domain]
  );

  const fresh = loaded && loaded.domain === domain ? loaded : null;

  return {
    categories: fresh?.categories ?? null,
    loading: enabled && !fresh,
    loadError: fresh?.error ?? null,
    supported: enabled,
    save,
    saving,
    saveError,
  };
}
