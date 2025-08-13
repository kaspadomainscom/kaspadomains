// src/app/domains/categories/page.tsx
import Link from "next/link";
import { Metadata } from "next";
import { loadCategoriesManifest, type CategoryManifest } from "@/data/categoriesManifest";

export const metadata: Metadata = {
  title: "Domain Categories | kaspadomains.com",
  description: "Browse all KNS domain categories like finance, gaming, characters, memes, and more.",
};

export default async function DomainCategoriesPage() {
  // Load categories manifest dynamically (async)
  const categoriesData: CategoryManifest = await loadCategoriesManifest();

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-4xl font-extrabold tracking-tight text-kaspaDark mb-4">
        Domain Categories
      </h1>
      <p className="text-lg text-gray-600 mb-10">
        Explore premium KNS domains by curated categories like finance, gaming, memes, and more.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {Object.entries(categoriesData).map(([slug, category]) => (
          <Link
            key={slug}
            href={`/domains/categories/category/${slug}`}
            className="group relative block rounded-2xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md hover:border-kaspaGreen"
          >
            <h2 className="text-xl font-semibold text-gray-900 group-hover:text-kaspaGreen mb-2">
              {category.title}
            </h2>
            <p className="text-sm text-gray-500">
              {category.domains.length} domain{category.domains.length !== 1 ? "s" : ""}
            </p>
            <span className="absolute top-4 right-4 inline-block rounded-full bg-kaspaGreen/10 px-3 py-0.5 text-xs font-medium text-kaspaGreen">
              {category.domains.length}
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
