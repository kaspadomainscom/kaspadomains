// src/hooks/domains/useGetAllowedCategories.ts
import { useEffect, useState } from 'react';
import { kasplexClient } from '@/lib/viemClient';
import { contracts } from '@/lib/contracts';
import { bytes32ToString } from '@/lib/utils';
import { isSupabaseConfigured, getSupabaseReadClient } from '@/lib/supabase';

/**
 * The categories a domain may be listed under.
 *
 * Reads from Supabase when it's the source of truth, falling back to
 * `DomainCategoriesStorage.getAllowedCategories` otherwise. Picking a category
 * is mandatory at listing time, so an empty list here blocks listing entirely
 * — which is why the failure is surfaced instead of being swallowed into an
 * empty array that looks like "no categories exist".
 */
export type CategoryOption = { key: string; title: string };

export function useGetAllowedCategories() {
  const [categories, setCategories] = useState<string[]>([]);
  // Keys are what the API needs; titles are what a person should be shown. The
  // key-only shape meant every picker in the app rendered raw slugs like
  // "realWords".
  const [options, setOptions] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!cancelled) {
        setLoading(true);
        setError(null);
      }

      try {
        if (isSupabaseConfigured) {
          const client = getSupabaseReadClient();
          if (!client) throw new Error('Supabase client unavailable');

          const { data, error: queryError } = await client
            .from('categories')
            .select('key, title')
            .eq('is_allowed', true)
            .order('sort_order', { ascending: true });

          if (queryError) throw new Error(queryError.message);
          if (!cancelled) {
            const rows = data ?? [];
            setCategories(rows.map((row) => row.key));
            setOptions(rows.map((row) => ({ key: row.key, title: row.title })));
          }
        } else {
          const result = await kasplexClient.readContract({
            address: contracts.DomainCategoriesStorage.address,
            abi: contracts.DomainCategoriesStorage.abi,
            functionName: 'getAllowedCategories',
          });
          if (!cancelled) {
            // The contract stores no titles, so the key is the best label
            // available on this path.
            const keys = (result as `0x${string}`[]).map(bytes32ToString);
            setCategories(keys);
            setOptions(keys.map((key) => ({ key, title: key })));
          }
        }
      } catch (err) {
        console.error('Error fetching allowed categories', err);
        if (!cancelled) {
          setCategories([]);
          setOptions([]);
          setError('Could not load categories.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { categories, options, loading, error };
}
