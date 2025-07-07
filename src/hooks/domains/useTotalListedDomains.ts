// src/hooks/domains/useTotalListedDomains.ts
import { useEffect, useState } from 'react';
import { kasplexClient } from '@/lib/viemClient';
import { contracts } from '@/lib/contracts';

export function useTotalListedDomains() {
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTotal() {
      try {
        const result = await kasplexClient.readContract({
          address: contracts.KaspaDomainsRegistry.address,
          abi: contracts.KaspaDomainsRegistry.abi,
          functionName: 'totalDomains',
        });
        setTotal(Number(result));
      } catch (err) {
        console.error('Error fetching total domains:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchTotal();
  }, []);

  return { total, loading };
}
