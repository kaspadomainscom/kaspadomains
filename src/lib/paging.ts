/**
 * Reading every row of a query that the server will happily truncate.
 *
 * ## Why this is its own module
 *
 * This loop lived inside `src/data/supabaseSource.ts`, which imports the
 * Supabase client through a `@/` alias — so it could not be tested. The test
 * runner strips types but does not resolve tsconfig paths, which means only
 * dependency-free modules are testable. Rather than leave the most
 * silently-wrong code in the app uncovered, the logic moved here: no imports, no
 * alias, no client.
 *
 * ## What it is defending against
 *
 * PostgREST caps the rows a single request may return, and a query past the cap
 * comes back **short, with no error**. There is no ceiling on how many listings
 * this directory can hold, so a single unbounded request is a matter of when it
 * truncates rather than if — and a truncated read is not a failure anyone sees.
 * It is search answering "No matching domains found" for a domain that exists
 * and has been paid for.
 */

/** How many rows to request per page. */
export const PAGE_SIZE = 500;

/**
 * Refuse to page past this many rows.
 *
 * Guards against a server that ignores `range` and returns the same page
 * forever, which would otherwise be an infinite loop rather than an error.
 */
export const MAX_ROWS = 100_000;

export type PageResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

/**
 * Read every row, one page at a time.
 *
 * `build` is called per page so each request gets a fresh query object — a
 * PostgREST query builder is single-use, and re-ranging one silently returns the
 * first page again.
 *
 * **Only an empty page means the end.** The obvious version of this loop treats
 * a *short* page as the end and advances by `PAGE_SIZE`, which breaks in exactly
 * the situation the function exists for: if the server's own cap is lower than
 * `PAGE_SIZE` (Supabase's `max-rows` is configurable), every page is short, the
 * loop stops after one, and the result is silently truncated to the cap. The
 * first version of this fix did precisely that and returned 100 of 10,000 rows
 * while reporting success. Advancing by the number of rows actually returned is
 * correct for any cap, at the cost of one final empty request.
 */
export async function fetchAllPages<T>(
  build: (from: number, to: number) => PromiseLike<PageResult<T>>,
  label: string
): Promise<T[]> {
  const all: T[] = [];

  for (let from = 0; ; ) {
    const { data, error } = await build(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Supabase: failed to load ${label} — ${error.message}`);

    const page = data ?? [];
    if (page.length === 0) return all;

    all.push(...page);
    from += page.length;

    if (all.length > MAX_ROWS) {
      throw new Error(`Supabase: refusing to page past ${MAX_ROWS} rows loading ${label}.`);
    }
  }
}
