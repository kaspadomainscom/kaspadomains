// src/hooks/likes/useGetUserLikesPaginated.ts
import { useEffect, useState } from 'react';
import { kasplexClient } from '@/lib/viemClient';
import { contracts } from '@/lib/contracts';

export function useGetUserLikesPaginated(
  userAddress: `0x${string}`,
  offset: number = 0,
  limit: number = 50
) {
  const [hashes, setHashes] = useState<`0x${string}`[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userAddress) return;

    (async () => {
      try {
        const result = await kasplexClient.readContract({
          address: contracts.DomainVotesManager.address,
          abi: contracts.DomainVotesManager.abi,
          functionName: 'getDomainHashesLikedByAddressPaginated',
          args: [userAddress, offset, limit],
        });

        setHashes(result as `0x${string}`[]);
      } catch (err) {
        console.error('getDomainHashesLikedByAddressPaginated error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [userAddress, offset, limit]);

  return { hashes, loading };
}
