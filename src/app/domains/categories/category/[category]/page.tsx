// src/app/domains/categories/category/[category]/page.tsx

import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { loadCategoriesManifest } from "@/data/categoriesManifest";
import { DomainCard } from "@/components/DomainCard";
import { JsonLd } from "@/components/JsonLd";
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
      alternates: {
        canonical: `https://kaspadomains.com/domains/categories/category/${category}`,
      },
      openGraph: {
        title,
        description,
        url: `https://kaspadomains.com/domains/categories/category/${category}`,
        siteName: "Kaspa Domains",
        images: [
          {
            url: "https://kaspadomains.com/og-image.png",
            width: 1024,
            height: 1024,
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

    const activeDomains = categoryData.domains.filter((d) => d.isActive);
    const nonce = (await headers()).get("x-csp-nonce") || undefined;
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `Premium ${categoryData.title} Domains`,
      itemListElement: activeDomains.map((domain, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `https://kaspadomains.com/domain/${domain.name}`,
        name: domain.name.endsWith(".kas") ? domain.name : `${domain.name}.kas`,
      })),
    };

    return (
      <main className="p-6 max-w-5xl mx-auto">
        <JsonLd json={jsonLd} nonce={nonce} />
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
