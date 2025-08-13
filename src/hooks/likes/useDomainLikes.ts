// src/hooks/likes/useDomainLikes.ts
import { useEffect, useState } from 'react';
import { kasplexClient } from '@/lib/viemClient';
import { contracts } from '@/lib/contracts';

export function useDomainLikes(domain: string) {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!domain) return;

    (async () => {
      try {
        const result = await kasplexClient.readContract({
          address: contracts.DomainVotesManager.address,
          abi: contracts.DomainVotesManager.abi,
          functionName: 'getDomainLikeCount',
          args: [domain],
        });
        setCount(Number(result));
      } catch (err) {
        console.error('getDomainLikeCount error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [domain]);

  return { count, loading };
}
