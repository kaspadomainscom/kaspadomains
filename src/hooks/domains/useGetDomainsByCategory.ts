// src/hooks/domains/useGetDomainsByCategory.ts
import { useEffect, useState } from 'react';
import { kasplexClient } from '@/lib/viemClient';
import { contracts } from '@/lib/contracts';
import { stringToBytes32 } from '@/lib/utils';

export function useGetDomainsByCategory(category: string) {
  const [domainHashes, setDomainHashes] = useState<bigint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!category) return;
    const b32 = stringToBytes32(category);

    async function fetch() {
      try {
        const result = await kasplexClient.readContract({
          address: contracts.DomainCategoriesStorage.address,
          abi: contracts.DomainCategoriesStorage.abi,
          functionName: 'getDomainsByCategory',
          args: [b32],
        });
        setDomainHashes(result as bigint[]);
      } catch (err) {
        console.error('Error fetching domains by category', err);
      } finally {
        setLoading(false);
      }
    }

    fetch();
  }, [category]);

  return { domainHashes, loading };
}
