// src/hooks/domains/useDomainStringFromHash.ts
import { useEffect, useState } from 'react';
import { kasplexClient } from '@/lib/viemClient';
import { contracts } from '@/lib/contracts';

export function useDomainStringFromHash(domainHash: bigint) {
  const [domain, setDomain] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!domainHash) return;

    async function fetch() {
      try {
        const result = await kasplexClient.readContract({
          address: contracts.KaspaDomainsRegistry.address,
          abi: contracts.KaspaDomainsRegistry.abi,
          functionName: 'domainStrings',
          args: [domainHash],
        });
        setDomain(result as string);
      } catch (err) {
        console.error('Error fetching domain string from hash:', err);
      } finally {
        setLoading(false);
      }
    }

    fetch();
  }, [domainHash]);

  return { domain, loading };
}
