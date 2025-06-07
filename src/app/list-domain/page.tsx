// src/app/list-domain/page.tsx
import Link from "next/link";
import { categoriesData } from "@/data/categoriesManifest";

export default function ListDomainPage() {
  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-4xl font-bold mb-8">All Domains</h1>
      {Object.values(categoriesData).map((category) => (
        <section key={category.title} className="mb-10">
          <h2 className="text-2xl font-semibold mb-4">{category.title}</h2>
          <ul className="list-disc list-inside space-y-2">
            {category.domains.map((domain) => (
              <li key={domain.name}>
                <Link
                  href={`/domain/${domain.name}`}
                  className="text-blue-600 underline hover:text-blue-800"
                >
                  {domain.name}
                </Link>{" "}
                — {domain.listed ? (
                  <span className="text-green-600">Listed</span>
                ) : (
                  <span className="text-gray-500">Unlisted</span>
                )}{" "}
                — Price: {domain.price} KAS
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
