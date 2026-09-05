import { loadCategoriesManifest } from "./categoriesManifest";
import type { Domain } from "./types";

/**
 * Finds a domain by its name (case-insensitive) across all categories.
 */
export async function findDomainByName(name: string): Promise<Domain | undefined> {
  if (!name) return undefined;
  const searchName = name.toLowerCase();

  let categoriesData;
  try {
    categoriesData = await loadCategoriesManifest();
  } catch (error) {
    // Callers (header search, domain lookups) treat "not found" and
    // "couldn't check" the same way today -- an honest "not found" is still
    // better than letting this throw into an unhandled rejection. See
    // docs/BUGS.md for why this manifest no longer fabricates fallback data.
    console.error("Failed to load categories manifest for domain lookup:", error);
    return undefined;
  }

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
 *
 * Rejects if the manifest can't be loaded, rather than returning an empty
 * list: its only caller is the search page, which needs to tell "we loaded
 * the list and nothing matched" apart from "we couldn't load the list at
 * all" -- collapsing those two into `[]` renders an outage as a confident
 * "No matching domains found" (see docs/MIND.md principles #2 and #3).
 */
export async function getAllDomains(): Promise<Domain[]> {
  const categoriesData = await loadCategoriesManifest();
  return Object.values(categoriesData).flatMap((category) => category.domains);
}
