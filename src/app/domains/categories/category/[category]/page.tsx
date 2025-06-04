// src/app/domains/categories/category/[category]/page.tsx

import { notFound } from "next/navigation";
import { categoriesData } from "@/data/categoriesManifest";
import { DomainCard } from "@/components/DomainCard";
import { Metadata } from "next";

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
  if (!categoryData) return { title: "Category Not Found" };

  const title = `${categoryData.title} | Kaspa Domains`;
  const description = `Explore ${categoryData.domains.length} premium KNS domains in the ${category} category. Perfect for Kaspa wallets, identity, and branding.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://kaspadomains.com/domains/categories/${category}`,
      siteName: "Kaspa Domains",
      images: [
        {
          url: "https://kaspadomains.com/og-image.png",
          width: 1200,
          height: 630,
          alt: "Kaspa Domains",
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
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-semibold mb-6">{categoryData.title}</h1>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {categoryData.domains.map((domain) => (
          <DomainCard key={domain.name} domain={domain} />
        ))}
      </div>
    </main>
  );
}
