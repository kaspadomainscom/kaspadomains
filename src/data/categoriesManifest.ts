// src/data/categoriesManifest.ts

import { Domain } from "./types";
import { fetchCategoryManifest } from "./supabaseSource";

// Keys are category slugs, values the title and that category's listings.
export type CategoryManifest = Record<
  string,
  {
    title: string;
    domains: Domain[];
  }
>;

/**
 * Every allowed category with its listings.
 *
 * Postgres is the only source. The Kasplex contract path that used to sit
 * behind this was removed on 2026-09-06: six of the eight configured addresses
 * had no deployed code and the other two failed every call, so the "fallback"
 * could not answer a single query. Keeping it meant every read path carried two
 * branches, one of which had never worked — and the dead branch was where
 * several real bugs hid, because nobody exercised it.
 *
 * Throws when the database is unreachable. Callers must render that as unknown,
 * never as an empty directory (see docs/MIND.md #2), which is why this does not
 * catch.
 */
export async function loadCategoriesManifest(): Promise<CategoryManifest> {
  return fetchCategoryManifest();
}
