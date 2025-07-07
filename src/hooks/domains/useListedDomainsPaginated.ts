// src/hooks/domains/useListedDomainsPaginated.ts
import { useEffect, useState } from 'react';
import { kasplexClient } from '@/lib/viemClient';
import { contracts } from '@/lib/contracts';

interface Props {
  offset: number;
  limit: number;
}

export function useListedDomainsPaginated({ offset, limit }: Props) {
  const [domainHashes, setDomainHashes] = useState<bigint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const result = await kasplexClient.readContract({
          address: contracts.KaspaDomainsRegistry.address,
          abi: contracts.KaspaDomainsRegistry.abi,
          functionName: 'getListedDomains',
          args: [BigInt(offset), BigInt(limit)],
        });
        setDomainHashes(result as bigint[]);
      } catch (err) {
        console.error('Error fetching domain hashes:', err);
      } finally {
        setLoading(false);
      }
    }

    fetch();
  }, [offset, limit]);

  return { domainHashes, loading };
}
