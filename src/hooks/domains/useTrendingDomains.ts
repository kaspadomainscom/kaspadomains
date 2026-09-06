// src/hooks/domains/useTrendingDomains.ts
"use client";

import { useEffect, useState } from 'react';
import { fetchCategoryDomains } from '@/data/supabaseSource';
import { baseDomainName } from '@/lib/domainName';

/** How many names the header strip shows. */
const TRENDING_LIMIT = 12;

/**
 * The names shown in the header's trending strip.
 *
 * The header renders on every page, so this is the most-executed data fetch in
 * the app. It used to load the *entire* category manifest -- every category,
 * every listing, every membership row -- to display a dozen names. One targeted
 * query instead.
 *
 * Failure is silent by design: the strip is decoration, and a header that
 * shouts about a database problem on every page is worse than one that quietly
 * shows nothing. The problem still surfaces properly on `/status` and in the
 * console.
 */
export function useTrendingDomains(): string[] {
  const [names, setNames] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    // One targeted query. There used to be a "chain fallback" here that called
    // loadCategoriesManifest -- which is now Supabase-only too, so the branch
    // loaded the *entire* manifest from the same source it was supposedly
    // falling back from. A leftover from removing the contract path, and
    // strictly worse than the branch it was standing in for.
    fetchCategoryDomains('trending', TRENDING_LIMIT)
      .then((domains) => {
        // baseDomainName owns the suffix rule; stripping it by hand here is how
        // the same format ends up with two definitions (MIND #17).
        if (!cancelled) setNames(domains.map((d) => baseDomainName(d.name)));
      })
      .catch((error) => {
        console.error('Failed to load trending domains', error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return names;
}
