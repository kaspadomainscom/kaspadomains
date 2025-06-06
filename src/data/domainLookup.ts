// src/data/domainLookup.ts
import { categoriesData } from "./categoriesManifest";
import type { Domain } from "./types";

/**
 * Finds a domain by its name (case-insensitive) across all categories.
 */
export function findDomainByName(name: string): Domain | undefined {
  
  if (!name) return undefined; // Guard: if name is falsy, return undefined early
  const searchName = name.toLowerCase();

  for (const category of Object.values(categoriesData)) {
    const domain = category.domains.find(
      (d) => d.name.toLowerCase() === searchName
    );
    if (domain) return domain;
  }

  return undefined;
}

/**
 * Returns all domains from all categories as a flat list.
 */
export function getAllDomains(): Domain[] {
  return Object.values(categoriesData).flatMap((category) => category.domains);
}
