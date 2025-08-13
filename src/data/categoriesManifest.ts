// src/data/categoriesManifest.ts

import { contracts } from "@/lib/contracts";
import { kasplexClient } from "@/lib/viemClient";
import { getContract } from "viem";
import { Domain } from "./types";

// Type for the manifest object:
// Keys are category names (string),
// values contain the title and an array of Domain objects.
export type CategoryManifest = Record<
  string,
  {
    title: string;
    domains: Domain[];
  }
>;

/**
 * Helper function to run async tasks with limited concurrency.
 * Prevents too many simultaneous calls that may overwhelm RPC.
 * 
 * @param poolLimit Maximum number of concurrent promises.
 * @param array Array of input items to process.
 * @param iteratorFn Async function to process each item.
 * @returns Promise resolving to an array of results.
 */
async function asyncPool<T, R>(
  poolLimit: number,
  array: T[],
  iteratorFn: (item: T) => Promise<R>
): Promise<R[]> {
  const ret: Promise<R>[] = [];
  const executing = new Set<Promise<R>>();

  for (const item of array) {
    const p = Promise.resolve().then(() => iteratorFn(item));
    ret.push(p);
    executing.add(p);

    p.finally(() => executing.delete(p));

    if (executing.size >= poolLimit) {
      await Promise.race(executing);
    }
  }

  return Promise.all(ret);
}

/**
 * Loads all categories and their domains into a manifest.
 * Uses pagination and concurrency limiting for efficient data fetching.
 * Falls back to a static manifest if on-chain calls fail.
 * 
 * @param pageSize Number of domains to fetch per pagination page (default 50).
 * @returns CategoryManifest mapping category keys to domain lists.
 */
export async function loadCategoriesManifest(
  pageSize: number = 50
): Promise<CategoryManifest> {
  // Create contract instances
  const registry = getContract({
    address: contracts.KaspaDomainsRegistry.address,
    abi: contracts.KaspaDomainsRegistry.abi,
    client: kasplexClient,
  });

  const categories = getContract({
    address: contracts.DomainCategoriesStorage.address,
    abi: contracts.DomainCategoriesStorage.abi,
    client: kasplexClient,
  });

  // Fallback static manifest (adjust or expand as needed)
  const fallbackManifest: CategoryManifest = {
    exampleCategory: {
      title: "Example Category",
      domains: [
        {
          id: 0,
          domainHash: BigInt(0),
          name: "example.kaspa",
          owner: "0x0000000000000000000000000000000000000000",
          createdAt: 0,
          isActive: true,
          feePaid: "0",
        },
      ],
    },
  };

  try {
    const manifest: CategoryManifest = {};

    // Step 1: Get all allowed category keys (bytes32 format on-chain)
    const allowedCategories = (await categories.read.getAllowedCategories()) as readonly `0x${string}`[];

    // For each category bytes32 key...
    for (const catBytes of allowedCategories) {
      // Convert bytes32 category key to readable string
      const categoryKey = (await categories.read.bytes32ToString([catBytes])) as string;

      const domains: Domain[] = [];
      let offset = 0;

      while (true) {
        // Step 2: Fetch a page of domain hashes for this category
        const domainHashes = (await categories.read.getDomainsByCategoryPaginated([
          catBytes,
          BigInt(offset),
          BigInt(pageSize),
        ])) as readonly bigint[];

        if (domainHashes.length === 0) break;

        // Step 3: Fetch detailed info for each domain concurrently with limit
        const domainDetails = await asyncPool(10, [...domainHashes], async (domainHash) => {
          const id = (await registry.read.hashToId([domainHash])) as bigint;

          const [hash, name, owner, createdAt, feePaid] = (await registry.read.getDomainById([id])) as [
            bigint,
            string,
            string,
            bigint,
            bigint
          ];

          return {
            id: Number(id),
            domainHash: hash,
            name,
            owner,
            createdAt: Number(createdAt),
            isActive: true,
            feePaid: feePaid.toString(),
          } as Domain;
        });

        domains.push(...domainDetails);
        offset += pageSize;
      }

      manifest[categoryKey] = {
        title: categoryKey,
        domains,
      };
    }

    return manifest;
  } catch (error) {
    console.error("Failed to load categories from contract, returning fallback manifest:", error);
    return fallbackManifest;
  }
}
