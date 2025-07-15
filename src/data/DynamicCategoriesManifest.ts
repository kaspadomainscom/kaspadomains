import { contracts } from '@/lib/contracts';
import { Domain } from './types';
import { kasplexClient } from '@/lib/viemClient';

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

function formatCategoryTitle(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const client = kasplexClient;
const ITEMS_PER_PAGE = 20;

export async function loadDynamicCategoryPage(
  categoryKey: string = 'all',
  page: number = 1
): Promise<Record<string, { title: string; domains: Domain[] }>> {
  const rawCategories = (await client.readContract({
    address: contracts.DomainCategoriesStorage.address,
    abi: contracts.DomainCategoriesStorage.abi,
    functionName: 'getAllowedCategories',
  })) as `0x${string}`[];

  const categorySlugs = rawCategories.map(bytes32ToString);

  const result: Record<string, { title: string; domains: Domain[] }> = {};

  const categoriesToLoad = categoryKey === 'all' ? categorySlugs : [categoryKey];

  for (const slug of categoriesToLoad) {
    const b32key = rawCategories[categorySlugs.indexOf(slug)];
    if (!b32key) continue;

    const allHashes = (await client.readContract({
      address: contracts.DomainCategoriesStorage.address,
      abi: contracts.DomainCategoriesStorage.abi,
      functionName: 'getDomainsByCategory',
      args: [b32key],
    })) as bigint[];

    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pagedHashes = allHashes.slice(start, end);

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
          listed: true, // TODO: fetch actual listed status
          price: 0, // TODO: fetch actual price
          kaspaLink: `https://explorer.kaspa.org/domain/${name}`,
        };
      })
    );

    result[slug] = {
      title: formatCategoryTitle(slug),
      domains,
    };
  }

  return result;
}
