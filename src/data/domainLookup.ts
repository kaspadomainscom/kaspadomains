import { loadCategoriesManifest } from "./categoriesManifest";
import { isSupabaseConfigured } from "@/lib/supabase";
import { fetchAllDomains, fetchDomainByName, fetchDomainCategories } from "./supabaseSource";
import type { Domain } from "./types";

/**
 * The three possible answers to "is this domain listed?".
 *
 * Three, not two. "Not listed" and "we could not check" look identical to a
 * caller that only gets `Domain | undefined`, and they must not be treated the
 * same: the first is a permanent 404 that tells crawlers to forget the page,
 * the second is a temporary outage on a domain someone paid to list. Collapsing
 * them means a database blip deletes a live listing from the web.
 *
 * See docs/MIND.md #14 -- this is the same shape of mistake as a health check
 * that reports OK because it could not see anything.
 */
export type DomainLookup =
  | { status: "found"; domain: Domain }
  | { status: "not-listed" }
  | { status: "unavailable"; error: Error };

/**
 * Look a domain up by name (case-insensitive), reporting *why* when it isn't
 * returned.
 */
export async function lookupDomain(name: string): Promise<DomainLookup> {
  if (!name) return { status: "not-listed" };
  const searchName = name.toLowerCase();

  // Indexed single-row lookup when the database is the source of truth,
  // instead of loading every category to scan for one name.
  if (isSupabaseConfigured) {
    try {
      const domain = await fetchDomainByName(searchName);
      return domain ? { status: "found", domain } : { status: "not-listed" };
    } catch (error) {
      console.error("Supabase lookup failed for", searchName, error);
      return { status: "unavailable", error: error as Error };
    }
  }

  let categoriesData;
  try {
    categoriesData = await loadCategoriesManifest();
  } catch (error) {
    console.error("Failed to load categories manifest for domain lookup:", error);
    return { status: "unavailable", error: error as Error };
  }

  for (const category of Object.values(categoriesData)) {
    const domain = category.domains.find(
      (d) => d.name.toLowerCase() === searchName
    );
    if (domain) return { status: "found", domain };
  }

  return { status: "not-listed" };
}

/**
 * Finds a domain by its name (case-insensitive).
 *
 * Convenience wrapper for callers that genuinely cannot act on the difference
 * between "not listed" and "couldn't check" -- header search, for one, where
 * both mean "no suggestion to show". Anything that renders a 404, or tells a
 * user their domain doesn't exist, must use `lookupDomain` instead.
 */
export async function findDomainByName(name: string): Promise<Domain | undefined> {
  const result = await lookupDomain(name);
  return result.status === "found" ? result.domain : undefined;
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
  // Straight table read when Supabase is the source of truth; the manifest
  // path would otherwise return the same domain once per category it's in.
  if (isSupabaseConfigured) {
    return fetchAllDomains();
  }

  const categoriesData = await loadCategoriesManifest();
  return Object.values(categoriesData).flatMap((category) => category.domains);
}

/**
 * The category title to show on a domain's profile page.
 *
 * Split out from `findDomainByName` because the two questions have different
 * consequences: whether a domain is listed decides whether the page exists at
 * all, while its category is only a label. Treating them as one lookup is what
 * made a live listing 404 when its category was withdrawn.
 *
 * Returns undefined when there is no category to show -- which callers should
 * render as "Uncategorized", never as "this domain does not exist".
 */
export async function findDomainCategoryTitle(name: string): Promise<string | undefined> {
  if (!name) return undefined;
  const searchName = name.toLowerCase();

  if (isSupabaseConfigured) {
    try {
      const categories = await fetchDomainCategories(searchName);
      if (categories.length === 0) return undefined;
      // Prefer a published category; fall back to a withdrawn one rather than
      // showing nothing, since the domain is genuinely in it.
      return (categories.find((c) => c.isAllowed) ?? categories[0]).title;
    } catch (error) {
      console.error("Supabase category lookup failed for", searchName, error);
      return undefined;
    }
  }

  try {
    const categoriesData = await loadCategoriesManifest();
    const normalized = searchName.replace(/\.kas$/, "");
    return Object.values(categoriesData).find((category) =>
      category.domains.some(
        (d) => d.name.toLowerCase().replace(/\.kas$/, "") === normalized
      )
    )?.title;
  } catch (error) {
    console.error("Failed to load categories manifest for category lookup:", error);
    return undefined;
  }
}
