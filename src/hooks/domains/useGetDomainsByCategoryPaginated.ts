// src/hooks/domains/useGetDomainsByCategoryPaginated.ts
import { useEffect, useState } from 'react';
import { kasplexClient } from '@/lib/viemClient';
import { contracts } from '@/lib/contracts';
import { stringToBytes32 } from '@/lib/utils';

interface UseGetDomainsByCategoryPaginatedProps {
  category: string;
  offset: number;
  limit: number;
}

export function useGetDomainsByCategoryPaginated({
  category,
  offset,
  limit,
}: UseGetDomainsByCategoryPaginatedProps) {
  const [domainHashes, setDomainHashes] = useState<bigint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!category || limit <= 0) return;
    const b32 = stringToBytes32(category);

    async function fetch() {
      setLoading(true);
      try {
        const result = await kasplexClient.readContract({
          address: contracts.DomainCategoriesStorage.address,
          abi: contracts.DomainCategoriesStorage.abi,
          functionName: 'getDomainsByCategoryPaginated',
          args: [b32, BigInt(offset), BigInt(limit)],
        });
        setDomainHashes(result as bigint[]);
      } catch (err) {
        console.error('Error fetching paginated domains by category', err);
      } finally {
        setLoading(false);
      }
    }

    fetch();
  }, [category, offset, limit]);

  return { domainHashes, loading };
}
