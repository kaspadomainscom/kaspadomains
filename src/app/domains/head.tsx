// src/app/domains/head.tsx
import { headers } from "next/headers";
import { loadCategoriesManifest } from "@/data/categoriesManifest";
export const dynamic = 'force-dynamic';

export default async function Head() {

    const headersList = await headers();
  const nonce = headersList.get("x-csp-nonce");

  // Load categories manifest asynchronously
  const categoriesData = await loadCategoriesManifest();

  const allListedDomains = Object.values(categoriesData).flatMap(({ domains }) =>
    domains
      .filter((d) => d.isActive)
      .map((d, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `https://kaspadomains.com/domain/${d.name}`,
        name: d.name.endsWith(".kas") ? d.name : `${d.name}.kas`,
      }))
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Kaspa Premium Domains Marketplace",
    itemListElement: allListedDomains,
  };

  return (
    <>
      <title>Premium Kaspa Domains Marketplace | KaspaDomains</title>
      <meta
        name="description"
        content="Discover and purchase premium .kas domains categorized by niche. Each listing is curated for uniqueness and value within the Kaspa ecosystem."
      />
      <script
        type="application/ld+json"
        nonce={nonce || undefined}
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd),
        }}
      />
    </>
  );
}
