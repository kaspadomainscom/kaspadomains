'use client';

import { contracts } from "@/lib/contracts";
import { kasplexClient } from "@/lib/viemClient";
import { useEffect, useState } from "react";
import { keccak256, toHex } from "viem";

interface DomainData {
  title: string;
  description: string;
  image: string;
  website: string;
  updatedAt: bigint;
}

export function useGetDomainData(domain: string) {
  const [data, setData] = useState<DomainData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!domain) return;

    const fetch = async () => {
      try {
        const domainHash = BigInt(keccak256(toHex(domain)));

        const result = await kasplexClient.readContract({
          address: contracts.DomainDataStorage.address,
          abi: contracts.DomainDataStorage.abi,
          functionName: "getDomainData",
          args: [domainHash],
        });

        const [title, description, image, website, updatedAt] = result as readonly [
          string,
          string,
          string,
          string,
          bigint
        ];

        setData({ title, description, image, website, updatedAt });
      } catch (err) {
        console.error("Failed to fetch domain data:", err);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [domain]);

  return { data, loading };
}
