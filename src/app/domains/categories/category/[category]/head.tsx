// src/app/domains/categories/category/[category]/head.tsx

import { headers } from "next/headers";
import { loadCategoriesManifest } from "@/data/categoriesManifest";

export const dynamic = 'force-dynamic'; // Required for access to request headers

export default async function Head({ params }: { params: { category: string } }) {
  const headersList = await headers();
  const nonce = headersList.get("x-csp-nonce");

  const categoryKey = params.category;

  // Dynamically load the latest categories manifest at runtime
  const manifest = await loadCategoriesManifest();

  const category = manifest[categoryKey];

  if (!category) return null;

  // Filter only active domains (using isActive flag)
  const listedDomains = category.domains.filter((d) => d.isActive);

  if (listedDomains.length === 0) return null;

  // Construct JSON-LD structured data for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Premium ${category.title} Domains`,
    itemListElement: listedDomains.map((domain, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `https://kaspadomains.com/domain/${domain.name}`,
      name: `${domain.name}.kas`,
    })),
  };

  return (
    <>
      <title>{category.title} | Kaspa Domains</title>
      <meta
        name="description"
        content={`Explore premium ${category.title} KNS domains available for purchase.`}
      />
      <script
        type="application/ld+json"
        nonce={nonce || undefined}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
