// src/hooks/domains/useDomainOwnerAndTimestamp.ts
import { useEffect, useState } from 'react';
import { kasplexClient } from '@/lib/viemClient';
import { contracts } from '@/lib/contracts';

interface DomainMeta {
  owner: `0x${string}`;
  timestamp: bigint;
}

export function useDomainOwnerAndTimestamp(domain: string) {
  const [data, setData] = useState<DomainMeta | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!domain) return;

    async function fetch() {
      try {
        const [owner, timestamp] = await kasplexClient.readContract({
          address: contracts.KaspaDomainsRegistry.address,
          abi: contracts.KaspaDomainsRegistry.abi,
          functionName: 'getDomainOwnerAndTimestamp',
          args: [domain],
        }) as [`0x${string}`, bigint];

        setData({ owner, timestamp });
      } catch (err) {
        console.error('Error fetching owner/timestamp:', err);
      } finally {
        setLoading(false);
      }
    }

    fetch();
  }, [domain]);

  return { data, loading };
}
