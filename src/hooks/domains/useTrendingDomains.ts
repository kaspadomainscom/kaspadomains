// src/hooks/domains/useTrendingDomains.ts
"use client";

import { useEffect, useState } from 'react';
import { isSupabaseConfigured } from '@/lib/supabase';
import { fetchCategoryDomains } from '@/data/supabaseSource';
import { loadCategoriesManifest } from '@/data/categoriesManifest';

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

    async function load(): Promise<string[]> {
      if (isSupabaseConfigured) {
        const domains = await fetchCategoryDomains('trending', TRENDING_LIMIT);
        return domains.map((d) => d.name);
      }
      // Chain fallback: no targeted query exists, so the manifest is the only
      // way to answer this.
      const manifest = await loadCategoriesManifest();
      return (manifest.trending?.domains ?? [])
        .slice(0, TRENDING_LIMIT)
        .map((d) => d.name);
    }

    load()
      .then((loaded) => {
        if (!cancelled) setNames(loaded.map((n) => n.replace(/\.kas$/i, '')));
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
