// src/hooks/domains/useGetDomainCategories.ts
import { useEffect, useState } from 'react';
import { kasplexClient } from '@/lib/viemClient';
import { contracts } from '@/lib/contracts';
import { domainToHash, bytes32ToString } from '@/lib/utils';

export function useGetDomainCategories(domain: string) {
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!domain) return;
    const hash = domainToHash(domain);

    async function fetch() {
      try {
        const result = await kasplexClient.readContract({
          address: contracts.DomainCategoriesStorage.address,
          abi: contracts.DomainCategoriesStorage.abi,
          functionName: 'getCategories',
          args: [hash],
        });
        setCategories((result as `0x${string}`[]).map(bytes32ToString));
      } catch (err) {
        console.error('Error fetching domain categories', err);
      } finally {
        setLoading(false);
      }
    }

    fetch();
  }, [domain]);

  return { categories, loading };
}
