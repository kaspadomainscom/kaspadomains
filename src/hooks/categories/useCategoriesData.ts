// src/data/categoriesManifest.ts
import { Domain } from "@/data/types";
import { contracts } from "@/lib/contracts";
import { kasplexClient } from "@/lib/viemClient";
import { getContract } from "viem";

export type CategoryManifest = Record<
  string,
  {
    title: string;
    domains: Domain[];
  }
>;

export async function loadCategoriesManifest(): Promise<CategoryManifest> {
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

  const manifest: CategoryManifest = {};

  // 1. Load all allowed categories
  const allowedCategories = (await categories.read.getAllowedCategories()) as readonly `0x${string}`[];

  for (const catBytes of allowedCategories) {
    // Convert bytes32 -> string key
    const categoryKey = (await categories.read.bytes32ToString([catBytes])) as string;

    // 2. Get domain hashes for this category
    const domainHashes = (await categories.read.getDomainsByCategory([catBytes])) as readonly bigint[];

    const domains: Domain[] = [];

    for (const domainHash of domainHashes) {
      // get numeric ID from hash
      const id = (await registry.read.hashToId([domainHash])) as bigint;

      // fetch full domain details
      const [hash, name, owner, createdAt, feePaid] = (await registry.read.getDomainById([id])) as [
        bigint,
        string,
        string,
        bigint,
        bigint
      ];

      domains.push({
        id: Number(id),
        domainHash: hash,
        name,
        owner,
        createdAt: Number(createdAt),
        isActive: true, // all in category should be active
        feePaid: feePaid.toString(),
      });
    }

    manifest[categoryKey] = {
      title: categoryKey,
      domains,
    };
  }

  return manifest;
}
