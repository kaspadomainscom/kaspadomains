// src/hooks/likes/useTotalLikesUsed.ts
import { useEffect, useState } from 'react';
import { kasplexClient } from '@/lib/viemClient';
import { contracts } from '@/lib/contracts';

export function useTotalLikesUsed(userAddress: `0x${string}`) {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userAddress) return;

    (async () => {
      try {
        const result = await kasplexClient.readContract({
          address: contracts.DomainLikesManager.address,
          abi: contracts.DomainLikesManager.abi,
          functionName: 'getAddressLikeCount',
          args: [userAddress],
        });
        setCount(Number(result));
      } catch (err) {
        console.error('getAddressLikeCount error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [userAddress]);

  return { count, loading };
}
