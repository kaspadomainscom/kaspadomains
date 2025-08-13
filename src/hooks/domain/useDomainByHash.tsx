// src/hooks/domain/useDomainByHash.tsx
"use client";

import { useEffect, useState } from 'react';
import { getContract } from 'viem';
import { contracts } from '@/lib/contracts';
import { kasplexClient } from '@/lib/viemClient';
import { Domain } from '@/data/types';


export function useDomainByHash(domainHash?: bigint) {
  const [data, setData] = useState<Domain | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (!domainHash) return;

    const fetchDomain = async () => {
      setIsLoading(true);
      setIsError(false);

      try {
        const registry = getContract({
          address: contracts.KaspaDomainsRegistry.address,
          abi: contracts.KaspaDomainsRegistry.abi,
          client: kasplexClient,
        });

        // Create the kns contract instance once, using your known KNS address + ABI
        const kns = getContract({
          address: contracts.DemoKNS.address,
          abi: contracts.DemoKNS.abi,
          client: kasplexClient,
        });

        // Fetch all data in parallel
        const [
          name,
          createdAt,
          isActive,
          feePaid,
          id,
          owner,
        ] = await Promise.all([
          registry.read.getDomainStringByHash([domainHash]) as Promise<string>,
          registry.read.getDomainCreationTime([domainHash]) as Promise<bigint>,
          registry.read.isHashListed([domainHash]) as Promise<boolean>,
          registry.read.domainFeePaid([domainHash]) as Promise<bigint>,
          registry.read.hashToId([domainHash]) as Promise<bigint>,
          kns.read.ownerOf([domainHash]) as Promise<string>,
        ]);

        setData({
          id: Number(id),
          domainHash,
          name,
          createdAt: Number(createdAt),
          isActive,
          feePaid: feePaid.toString(),
          owner,
        });
      } catch (err) {
        console.error(`❌ Failed to fetch domain data for hash: ${domainHash}`, err);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDomain();
  }, [domainHash]);

  return { data, isLoading, isError };
}
