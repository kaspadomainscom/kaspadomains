import { cache } from 'react';
import { loadCategoriesManifest, type CategoryManifest } from './categoriesManifest';

/**
 * The category manifest, loaded **once per server request**.
 *
 * ## Why this is a separate module
 *
 * `react`'s `cache` is only meaningful during a server render, and
 * `categoriesManifest.ts` is imported by client components too
 * (`app/domains/page.tsx`, `hooks/domains/useTrendingDomains.ts`). Wrapping the
 * function there would put a `cache()` call into the browser bundle, where it
 * has no request to scope to. So the raw loader stays where it is and this file
 * — imported only from server components, route handlers and the libraries they
 * use — adds the memoisation.
 *
 * ## What it fixes
 *
 * Rendering the homepage loaded this manifest **three times**, sequentially, and
 * nothing connected the three: the page loads it directly, `loadTopVotedDomains`
 * loads it to rank votes, and `getItemListJsonLd` loads it again for the
 * structured data. Each load is two queries, one of which pages through the
 * largest table in the schema — so the site's heaviest read ran three times to
 * render one page, and would have grown three times as fast as the directory.
 *
 * The three loads are visible in the log: rendering the homepage produced three
 * separate "failed to load category membership" errors, one per caller, each
 * with its own stack. Adding this collapsed the page from 21.5s to 7.4s —
 * exactly the 3x the diagnosis predicts.
 *
 * Those absolute numbers are **not** a production measurement: they came from a
 * sandbox whose network cannot reach Supabase, so each attempt pays a ~7.4s
 * connection timeout. The ratio is the real result. What a working database pays
 * is the same multiplier on a much smaller number — and it grows with the
 * directory, since the paged query is the largest read in the schema.
 *
 * `cache` memoises the promise, rejection included, which is what we want: three
 * callers in one render must agree about whether the database answered.
 */
export const loadCategoriesManifestOnce: () => Promise<CategoryManifest> =
  cache(loadCategoriesManifest);
