"use client";

import { useEffect, useState } from 'react';
import { useWalletContext } from '@/context/WalletContext';
import { contracts } from '@/lib/contracts';
import { kasplexClient } from '@/lib/viemClient';
import { Address } from 'viem';

export function useMyVotes() {
  const { account } = useWalletContext();
  const [data, setData] = useState<bigint[] | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [isError, setError] = useState(false);
  const [error, setErrorMsg] = useState<Error | null>(null);

  useEffect(() => {
    if (!account) return;

    const fetchVotes = async () => {
      setLoading(true);
      setError(false);

      try {
        const result = await kasplexClient.readContract({
          address: contracts.DomainVotesManager.address,
          abi: contracts.DomainVotesManager.abi,
          functionName: 'getVotesByAddress',
          args: [account as Address],
        });

        setData(result as bigint[]);
      } catch (err) {
        setError(true);
        setErrorMsg(err as Error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVotes();
  }, [account]);

  return { data, isLoading, isError, error };
}
