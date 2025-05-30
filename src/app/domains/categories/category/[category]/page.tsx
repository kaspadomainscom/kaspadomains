// src/app/domains/categories/category/[category]/page.tsx

import { notFound } from "next/navigation";
import { categoriesData } from "@/data/categoriesManifest";
import { DomainCard } from "@/components/DomainCard";
import { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";

type StaticParam = { category: string };

export function generateStaticParams(): StaticParam[] {
  return Object.keys(categoriesData).map((category) => ({ category }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const categoryData = categoriesData[category];
  if (!categoryData) return {};

  const title = `${categoryData.title} | Kaspa Domains`;
  const description = `Browse ${categoryData.domains.length} premium ${category} KNS domains.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://kaspadomains.com/domains/categories/${category}`,
      siteName: "kaspadomains.com",
      images: [
        {
          url: "https://kaspadomains.com/og-image.png",
          width: 1200,
          height: 630,
          alt: "kaspadomains.com",
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["https://kaspadomains.com/twitter-image.png"],
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const categoryData = categoriesData[category];

  if (!categoryData) return notFound();

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">{categoryData.title}</h1>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `${categoryData.title} KNS Domains`,
          description: `Premium Kaspa KNS domains in the ${categoryData.title} category.`,
          itemListElement: categoryData.domains.map((domain, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: `https://kaspadomains.com/domains/categories/${category}#${domain.name}`,
            name: domain.name,
            additionalProperty: [
              {
                "@type": "PropertyValue",
                name: "Kaspa Address Domain",
                value: domain.name,
              },
              {
                "@type": "PropertyValue",
                name: "Price",
                value: `${domain.price} KAS`,
              },
            ],
          })),
        }}
      />

      <div className="grid gap-4">
        {categoryData.domains.map((domain, i) => (
          <DomainCard key={i} domain={domain} />
        ))}
      </div>
    </main>
  );
}
