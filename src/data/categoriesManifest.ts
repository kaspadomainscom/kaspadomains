// src/data/categoriesManifest.ts

import { contracts } from "@/lib/contracts";
import { kasplexClient } from "@/lib/viemClient";
import { getContract } from "viem";
import { Domain } from "./types";
import { isSupabaseConfigured } from "@/lib/supabase";
import { fetchCategoryManifest } from "./supabaseSource";

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
  // Supabase is the primary store while the Kasplex contracts are unreachable
  // (see docs/BUGS.md). When it isn't configured this falls through to the
  // on-chain path below unchanged, so a deployment without a database behaves
  // exactly as it did before -- and so the chain becomes the source of truth
  // again simply by unsetting the Supabase env vars.
  if (isSupabaseConfigured) {
    return fetchCategoryManifest();
  }

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
    // Never fabricate data here -- this function is the sole source of truth
    // for domains/categories across ~11 callers (homepage, sitemap, category
    // pages, JSON-LD, search, the header). A previous version of this catch
    // swallowed the error and returned a hardcoded fake domain
    // ("example.kaspa"), which could surface as real-looking content anywhere
    // in the app and silently prevented callers' own honest error states
    // (e.g. app/domain/[name]/page.tsx's "Contract Unavailable" UI) from ever
    // running. Every caller must handle a rejected promise here.
    console.error("Failed to load categories from contract:", error);
    throw error;
  }
}
