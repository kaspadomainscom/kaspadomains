// src/app/domains/categories/category/[category]/page.tsx

import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
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
  // Data-fetching (which can throw) stays in try/catch; JSX is constructed
  // outside it so unexpected render errors surface to the nearest error
  // boundary instead of being silently swallowed here. A genuine load
  // failure and "this category doesn't exist" are kept as separate outcomes
  // below -- collapsing them into one notFound() call previously meant a
  // real outage was mislabeled as a 404 (see docs/MIND.md principle #11).
  let categoryData: Awaited<ReturnType<typeof loadCategoriesManifest>>[string] | undefined;
  let nonce: string | undefined;
  let loadFailed = false;

  try {
    const resolvedParams = await params;
    const category = resolvedParams.category;

    const categoriesData = await loadCategoriesManifest();
    categoryData = categoriesData[category];
    nonce = (await headers()).get("x-csp-nonce") || undefined;
  } catch (error) {
    console.error("Failed to load category page data:", error);
    loadFailed = true;
  }

  // Blames nothing in particular on purpose. This used to say "the smart
  // contract is not responding or not deployed" -- listings have been in
  // Postgres since 2026-09-05, so that told users the opposite of what was
  // happening and sent anyone debugging it to a component that is not in the
  // request path.
  if (loadFailed) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-10 text-center text-gray-100">
        <h1 className="text-2xl font-bold mb-4">Temporarily unavailable</h1>
        <p className="text-gray-300">
          We couldn&apos;t load this category right now. This is a problem on our side —
          please try again in a few moments.
        </p>
      </main>
    );
  }

  if (!categoryData) return notFound();

  const activeDomains = categoryData.domains.filter((d) => d.isActive);
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
      <nav className="text-sm text-gray-400 mb-6 flex gap-2 flex-wrap" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-kaspaMint hover:underline">Home</Link>
        <span>/</span>
        <Link href="/domains/categories" className="hover:text-kaspaMint hover:underline">Categories</Link>
        <span>/</span>
        <span className="text-gray-200">{categoryData.title}</span>
      </nav>
      <h1 className="text-3xl font-semibold mb-6">{categoryData.title}</h1>
      {activeDomains.length === 0 ? (
        <p className="text-gray-400">
          No domains listed in this category yet —{" "}
          <Link href="/list-domain" className="text-kaspaMint hover:underline">
            be the first
          </Link>
          .
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {categoryData.domains.map((domain) => (
            <DomainCard key={domain.name} domain={domain} />
          ))}
        </div>
      )}
    </main>
  );
}
