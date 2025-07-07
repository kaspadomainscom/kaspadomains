// src/hooks/domains/useGetAllowedCategories.ts
import { useEffect, useState } from 'react';
import { kasplexClient } from '@/lib/viemClient';
import { contracts } from '@/lib/contracts';
import { bytes32ToString } from '@/lib/utils';

export function useGetAllowedCategories() {
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const result = await kasplexClient.readContract({
          address: contracts.DomainCategoriesStorage.address,
          abi: contracts.DomainCategoriesStorage.abi,
          functionName: 'getAllowedCategories',
        });
        setCategories((result as `0x${string}`[]).map(bytes32ToString));
      } catch (err) {
        console.error('Error fetching allowed categories', err);
      } finally {
        setLoading(false);
      }
    }

    fetch();
  }, []);

  return { categories, loading };
}
