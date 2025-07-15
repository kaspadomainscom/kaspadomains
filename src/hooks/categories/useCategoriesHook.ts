// src/hooks/useCategories.ts
import { useEffect, useState } from 'react';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains'; // replace with your chain or custom Kaspa chain config
import { contracts } from '@/lib/contracts';
import { Domain } from '@/data/types';

export type CategoryMap = Record<
  string,
  {
    title: string;
    domains: Domain[];
  }
>;

function formatCategoryTitle(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function useCategories() {
  const [data, setData] = useState<CategoryMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Setup viem client, replace mainnet with your chain if needed
    const client = createPublicClient({
      chain: mainnet,
      transport: http(),
    });

    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        // Read allowed categories (bytes32[])
        const rawCategories = await client.readContract({
          address: contracts.DomainCategoriesStorage.address,
          abi: contracts.DomainCategoriesStorage.abi,
          functionName: 'getAllowedCategories',
        }) as `0x${string}`[];

        const categoryMap: CategoryMap = {};

        for (const catBytes32 of rawCategories) {
          // convert bytes32 to string
          const catString = bytes32ToString(catBytes32);

          // get domain hashes by category
          const domainHashes = await client.readContract({
            address: contracts.DomainCategoriesStorage.address,
            abi: contracts.DomainCategoriesStorage.abi,
            functionName: 'getDomainsByCategory',
            args: [catBytes32],
          }) as bigint[];

          // fetch domain names from registry for each domain hash
          const domains: Domain[] = await Promise.all(
            domainHashes.map(async (hash) => {
              const name = await client.readContract({
                address: contracts.KaspaDomainsRegistry.address,
                abi: contracts.KaspaDomainsRegistry.abi,
                functionName: 'getDomainStringByHash',
                args: [hash],
              }) as string;

              return {
                name,
                domainHash: hash.toString(),
              };
            })
          );

          categoryMap[catString] = {
            title: formatCategoryTitle(catString),
            domains,
          };
        }

        setData(categoryMap);
      } catch (err: unknown) {
        console.error('Error loading categories:', err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Unknown error');
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  return { data, isLoading, error };
}

// Helper function to convert bytes32 to string (similar to ethers.utils.parseBytes32String)
function bytes32ToString(bytes32: `0x${string}`): string {
  const hex = bytes32.slice(2);
  let str = '';
  for (let i = 0; i < 64; i += 2) {
    const code = parseInt(hex.slice(i, i + 2), 16);
    if (code === 0) break;
    str += String.fromCharCode(code);
  }
  return str;
}
