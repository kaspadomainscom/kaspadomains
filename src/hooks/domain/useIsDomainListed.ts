// src/hooks/domains/useIsDomainListed.ts
import { useEffect, useState } from 'react';
import { kasplexClient } from '@/lib/viemClient';
import { contracts } from '@/lib/contracts';

export function useIsDomainListed(domain: string) {
  const [isListed, setIsListed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!domain) return;

    async function fetch() {
      try {
        const result = await kasplexClient.readContract({
          address: contracts.KaspaDomainsRegistry.address,
          abi: contracts.KaspaDomainsRegistry.abi,
          functionName: 'isListed',
          args: [domain],
        });
        setIsListed(result as boolean);
      } catch (err) {
        console.error('Error checking isListed:', err);
      } finally {
        setLoading(false);
      }
    }

    fetch();
  }, [domain]);

  return { isListed, loading };
}
