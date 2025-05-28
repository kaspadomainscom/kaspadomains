import Link from "next/link";
import { categoriesData } from "@/data/categoriesManifest";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Domain Categories | kaspadomains.com",
  description: "Browse all KNS domain categories like finance, gaming, characters, memes, and more.",
};

export default function DomainCategoriesPage() {
  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-4xl font-bold mb-6">Domain Categories</h1>
      <p className="text-gray-600 mb-8">
        Explore premium KNS domains by category.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {Object.entries(categoriesData).map(([slug, category]) => (
          <Link
            key={slug}
            href={`/categories/category/${slug}`}
            className="block border border-gray-200 rounded-2xl p-4 hover:shadow-md transition-shadow"
          >
            <h2 className="text-xl font-semibold mb-2">{category.title}</h2>
            <p className="text-sm text-gray-600">
              {category.domains.length} domain{category.domains.length !== 1 ? "s" : ""}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
