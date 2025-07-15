// src/data/DynamicCategoriesManifest.ts
import { createPublicClient, http } from 'viem';
import { contracts } from '@/lib/contracts';
import { Domain } from './types';
import { kasplexTestnet } from '@/lib/viemChains';

// Helper: bytes32 to string
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

// Format slug to title
function formatCategoryTitle(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const client = createPublicClient({
  chain: kasplexTestnet,
  transport: http(),
});

const ITEMS_PER_PAGE = 20;

export async function loadDynamicCategoryPage(
  categoryKey: string = 'all',
  page: number = 1
): Promise<Record<string, { title: string; domains: Domain[] }>> {
  // 1. Get all allowed categories (bytes32[])
  const rawCategories = (await client.readContract({
    address: contracts.DomainCategoriesStorage.address,
    abi: contracts.DomainCategoriesStorage.abi,
    functionName: 'getAllowedCategories',
  })) as `0x${string}`[];

  // 2. Convert bytes32 keys to string slugs
  const categorySlugs = rawCategories.map(bytes32ToString);

  // Prepare result map
  const result: Record<string, { title: string; domains: Domain[] }> = {};

  // If categoryKey === 'all', load all categories, else just one
  const categoriesToLoad = categoryKey === 'all' ? categorySlugs : [categoryKey];

  for (const slug of categoriesToLoad) {
    // Find bytes32 key for this slug
    const b32key = rawCategories[categorySlugs.indexOf(slug)];
    if (!b32key) continue;

    // Fetch all domain hashes for this category (bigint[])
    const allHashes = (await client.readContract({
      address: contracts.DomainCategoriesStorage.address,
      abi: contracts.DomainCategoriesStorage.abi,
      functionName: 'getDomainsByCategory',
      args: [b32key],
    })) as bigint[];

    // Pagination slice
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pagedHashes = allHashes.slice(start, end);

    // Fetch domain names by hash
    const domains: Domain[] = await Promise.all(
      pagedHashes.map(async (domainHash) => {
        const name = (await client.readContract({
          address: contracts.KaspaDomainsRegistry.address,
          abi: contracts.KaspaDomainsRegistry.abi,
          functionName: 'getDomainStringByHash',
          args: [domainHash],
        })) as string;

        return {
          name,
          domainHash: domainHash.toString(),
          listed: true, // You may want to fetch real listed status
          price: 0, // You may want to fetch real price here
          kaspaLink: `https://explorer.kaspa.org/domain/${name}`, // example
        };
      })
    );

    // Add category data to result
    result[slug] = {
      title: formatCategoryTitle(slug),
      domains,
    };
  }

  return result;
}
