// src/hooks/likes/useHasUserLiked.ts
import { useEffect, useState } from 'react';
import { kasplexClient } from '@/lib/viemClient';
import { contracts } from '@/lib/contracts';

export function useHasUserLiked(domain: string, userAddress: `0x${string}`) {
  const [hasLiked, setHasLiked] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userAddress || !domain) return;

    (async () => {
      try {
        const result = await kasplexClient.readContract({
          address: contracts.DomainLikesManager.address,
          abi: contracts.DomainLikesManager.abi,
          functionName: 'hasUserLikedDomain',
          args: [userAddress, domain],
        });
        setHasLiked(Boolean(result));
      } catch (err) {
        console.error('hasUserLikedDomain error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [userAddress, domain]);

  return { hasLiked, loading };
}
