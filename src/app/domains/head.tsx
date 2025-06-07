// src/app/domains/head.tsx

import { headers } from "next/headers";
import { categoriesData } from "@/data/categoriesManifest";

export default async function Head() {
  const headersList = await headers();
  const nonce = headersList.get("x-csp-nonce");
  
  if (!nonce) { 
    console.error("csp nonce missing domains/head.tsx");
  }

  // Suppress unused vars warning since we keep categoryKey and title in output for future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const allListedDomains = Object.entries(categoriesData).flatMap(
    ([categoryKey, { title, domains }]) =>
      domains
        .filter((d) => d.listed)
        .map((d, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `https://kaspadomains.com/domain/${d.name}`,
          name: `${d.name}.kas`,
          categoryKey,
          title,
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
      <title>Premium Kaspa Domains Marketplace | Kaspadomains</title>
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
