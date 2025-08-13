import { loadCategoriesManifest } from "./categoriesManifest";
import type { Domain } from "./types";

/**
 * Finds a domain by its name (case-insensitive) across all categories.
 */
export async function findDomainByName(name: string): Promise<Domain | undefined> {
  if (!name) return undefined;
  const searchName = name.toLowerCase();

  const categoriesData = await loadCategoriesManifest();

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
export async function getAllDomains(): Promise<Domain[]> {
  const categoriesData = await loadCategoriesManifest();
  return Object.values(categoriesData).flatMap((category) => category.domains);
}
