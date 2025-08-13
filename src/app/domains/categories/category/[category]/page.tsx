// src/app/domains/categories/category/[category]/page.tsx

import { notFound } from "next/navigation";
import { loadCategoriesManifest } from "@/data/categoriesManifest";
import { DomainCard } from "@/components/DomainCard";
import type { Metadata } from "next";

type StaticParam = { category: string };

export async function generateStaticParams(): Promise<StaticParam[]> {
  try {
    const categoriesData = await loadCategoriesManifest();
    return Object.keys(categoriesData).map((category) => ({ category }));
  } catch (error) {
    console.error("Failed to load categories manifest for static params:", error);
    // Return empty array so no pages get generated at build time
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  try {
    const resolvedParams = await params;
    const category = resolvedParams.category;

    const categoriesData = await loadCategoriesManifest();
    const categoryData = categoriesData[category];

    if (!categoryData) {
      return { title: "Category Not Found" };
    }

    const title = `${categoryData.title} | Kaspa Domains`;
    const description = `Explore ${categoryData.domains.length} premium KNS domains in the ${category} category. Perfect for Kaspa wallets, identity, and branding.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `https://kaspadomains.com/domains/categories/category/${category}`,
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
        images: ["https://kaspadomains.com/kaspadomains-logo.jpg"],
      },
    };
  } catch (error) {
    console.error("Failed to generate metadata:", error);
    return { title: "Kaspa Domains" };
  }
}

interface PageProps {
  params: Promise<{ category: string }>;
}

export default async function CategoryPage({ params }: PageProps) {
  try {
    const resolvedParams = await params;
    const category = resolvedParams.category;

    const categoriesData = await loadCategoriesManifest();
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
  } catch (error) {
    console.error("Failed to load category page data:", error);
    return notFound();
  }
}
