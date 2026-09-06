import { loadCategoriesManifestOnce } from '@/data/categoriesManifest.server';
import type { CategoryManifest } from '@/data/categoriesManifest';
import { BrowseDomains } from '@/components/pages/domains/BrowseDomains';

/**
 * The directory's main browse page.
 *
 * This was a client component that fetched the whole manifest in a `useEffect`,
 * which meant the listings only existed after hydration: the HTML served for the
 * browse page of a *directory site* contained no domains, and anything reading
 * it without running JavaScript saw an empty page. `/domains` is indexable (it
 * is not in `robots.txt`'s disallow list) and is linked from every page, so that
 * was the worst place in the app for content to be invisible.
 *
 * The read moved here; `BrowseDomains` keeps the filtering, search and paging.
 *
 * Loading state went away with the fetch -- the page is rendered when its data
 * is ready, and the route's own `loading.tsx` covers the wait. What is left is
 * the distinction that matters: a failed read is not an empty directory, and
 * must not be rendered as one (`MIND.md` #2).
 */
export default async function DomainsPage() {
  let manifest: CategoryManifest | null = null;
  try {
    manifest = await loadCategoriesManifestOnce();
  } catch (error) {
    console.error('Failed to load categories manifest:', error);
  }

  return (
    <div className="min-h-screen bg-[#0b1e1d]">
      <section className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        <header className="space-y-6 max-w-3xl mx-auto text-center">
          <h1 className="text-5xl font-extrabold text-white tracking-tight">Browse .kas Domains</h1>
          <p className="text-lg text-gray-400 leading-relaxed">
            Every domain here is registered on Kaspa L1 through KNS and owned directly by its
            holder. The listing itself lives in our index — KaspaDomains is a registry and
            discovery layer, not a marketplace. Browse by category or search by name.
          </p>
        </header>

        {manifest === null ? (
          <div className="mx-auto max-w-lg rounded-lg border border-amber-500/30 bg-amber-500/5 p-6 text-center text-amber-200">
            <p className="font-medium">We couldn&apos;t load the domain list.</p>
            <p className="mt-1 text-sm text-amber-200/80">
              This is a problem on our side, not an empty directory &mdash; please try again
              in a few moments.
            </p>
          </div>
        ) : (
          <BrowseDomains manifest={manifest} />
        )}
      </section>
    </div>
  );
}
