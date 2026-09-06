// src/app/domains/categories/page.tsx
import Link from "next/link";
import { Metadata } from "next";
import { loadCategoriesManifest, type CategoryManifest } from "@/data/categoriesManifest";

export const metadata: Metadata = {
  title: "Domain Categories | kaspadomains.com",
  description: "Browse all KNS domain categories like finance, gaming, characters, memes, and more.",
};

export default async function DomainCategoriesPage() {
  // Three outcomes, not two. Falling back to `{}` on failure meant an outage
  // rendered as "No categories available right now." -- a confident statement
  // that there are none, on a site whose entire navigation is categories. The
  // manifest stopped fabricating data on error precisely so callers could tell
  // these apart; collapsing them here threw that away again. See docs/MIND.md #2.
  let categoriesData: CategoryManifest | null = null;
  let loadFailed = false;
  try {
    categoriesData = await loadCategoriesManifest();
  } catch (error) {
    console.error("Failed to load categories manifest:", error);
    loadFailed = true;
  }

  return (
    <div className="min-h-screen bg-[#0b1e1d]">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <nav className="text-sm text-gray-400 mb-6 flex gap-2 flex-wrap" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-kaspaMint hover:underline">Home</Link>
          <span>/</span>
          <span className="text-gray-200">Categories</span>
        </nav>
        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-4">
          Domain Categories
        </h1>
        <p className="text-lg text-gray-400 mb-10">
          Explore premium KNS domains by curated categories like finance, gaming, memes, and more.
        </p>

        {loadFailed || !categoriesData ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-6 text-amber-200">
            <p className="font-medium">We couldn&apos;t load the categories.</p>
            <p className="mt-1 text-sm text-amber-200/80">
              This is a problem on our side, not an empty catalogue — please try again in a
              few moments.
            </p>
          </div>
        ) : Object.keys(categoriesData).length === 0 ? (
          <p className="text-gray-400">No categories available right now.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {Object.entries(categoriesData).map(([slug, category]) => (
              <Link
                key={slug}
                href={`/domains/categories/category/${slug}`}
                className="group relative block rounded-2xl border border-[#1d3b39] bg-[#122c2a] p-5 transition-shadow hover:shadow-lg hover:border-kaspaMint/50"
              >
                <h2 className="text-xl font-semibold text-white group-hover:text-kaspaMint mb-2">
                  {category.title}
                </h2>
                <p className="text-sm text-gray-400">
                  {category.domains.length} domain{category.domains.length !== 1 ? "s" : ""}
                </p>
                <span className="absolute top-4 right-4 inline-block rounded-full bg-kaspaMint/10 px-3 py-0.5 text-xs font-medium text-kaspaMint">
                  {category.domains.length}
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
