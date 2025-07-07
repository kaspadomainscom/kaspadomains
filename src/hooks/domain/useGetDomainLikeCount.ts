// src/hooks/domain/useGetDomainLikes.ts
import { useCallback } from 'react';
import { contracts } from '@/lib/contracts';
import type { PublicClient, Abi } from 'viem';

const abi = contracts.DomainLikesManager.abi as Abi;
const address = contracts.DomainLikesManager.address;

export function useDomainLikes(client: PublicClient) {
  const getDomainLikeCount = useCallback(
    async (domain: string): Promise<bigint> => {
      if (!domain) throw new Error('Domain is required');

      const result = await client.readContract({
        address,
        abi,
        functionName: 'getDomainLikeCount',
        args: [domain],
      });

      return result as bigint;
    },
    [client]
  );

  return { getDomainLikeCount };
}
