// src/app/domain/[name]/page.tsx

import { notFound, redirect } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { findDomainByName, getAllDomains } from "@/data/domainLookup";
import { categoriesData } from "@/data/categoriesManifest";
import type { Domain } from "@/data/types";

type StaticParam = { name: string };

/**
 * Ensure the incoming string is always lowercase and ends with ".kas"
 */
function ensureKasSuffix(name: string): string {
  const base = name.trim().toLowerCase();
  return base.endsWith(".kas") ? base : `${base}.kas`;
}

/**
 * Normalize to lowercase and strip ".kas"
 */
function normalizeDomainName(name: string): string {
  return name.trim().toLowerCase().replace(/\.kas$/, "");
}

/**
 * Given a domain like "foo.kas", find its category title
 */
function findCategoryTitleByDomainName(domainName: string): string | undefined {
  const normalized = normalizeDomainName(domainName);
  for (const category of Object.values(categoriesData)) {
    if (
      category.domains.some(
        (d) => normalizeDomainName(d.name) === normalized
      )
    ) {
      return category.title;
    }
  }
  return undefined;
}

/**
 * Build the list of all [name] parameters for static generation.
 * Each generated param will be something like { name: "foo.kas" }.
 */
export function generateStaticParams(): StaticParam[] {
  return getAllDomains().map((domain: Domain) => ({
    name: ensureKasSuffix(domain.name),
  }));
}

/**
 * SEO metadata for each domain page
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}): Promise<Metadata> {
  const { name } = await params;
  const incoming = ensureKasSuffix(name);
  const domainData: Domain | undefined = findDomainByName(incoming);
  if (!domainData) {
    notFound();
  }

  const category =
    findCategoryTitleByDomainName(domainData.name) ?? "Unknown";

  return {
    title: `${domainData.name} — Premium ${category} Domain | kaspadomains.com`,
    description: `Buy ${domainData.name}, a premium KNS domain listed in the ${category} category.`,
    openGraph: {
      title: domainData.name,
      description: `Premium KNS domain in ${category}`,
      url: `https://kaspadomains.com/domain/${domainData.name}`,
      images: [
        {
          url: "https://kaspadomains.com/og-image.png",
          width: 1200,
          height: 630,
          alt: domainData.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: domainData.name,
      description: `Premium KNS domain in ${category}`,
    },
  };
}

/**
 * Actual page component for /domain/[name]
 */
export default async function DomainPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name: domainParam } = await params;
  if (!domainParam) {
    console.warn("No domain param");
    return notFound();
  }

  // Canonicalize to lowercase + ensure ".kas"
  const canonical = ensureKasSuffix(domainParam);

  // Redirect if URL is not the canonical form
  if (domainParam !== canonical) {
    redirect(`/domain/${canonical}`);
  }

  // Look up the domain using the imported function
  const domainData: Domain | undefined = findDomainByName(canonical);
  if (!domainData) {
    console.warn(`Domain not found: ${canonical}`);
    return notFound();
  }

  const category =
    findCategoryTitleByDomainName(domainData.name) ?? "Unknown";

  return (
    <main className="max-w-3xl mx-auto p-6">
      <header>
        <h1 className="text-4xl font-bold text-gray-900 mb-6">
          {domainData.name}
        </h1>
      </header>

      <section className="space-y-4 text-gray-700 text-base">
        <p>
          <span className="font-medium">Category:</span> {category}
        </p>
        <p>
          <span className="font-medium">Status:</span>{" "}
          <span
            className={domainData.listed ? "text-green-600" : "text-gray-500"}
          >
            {domainData.listed ? "Listed" : "Unlisted"}
          </span>
        </p>
        <p>
          <span className="font-medium">Price:</span>{" "}
          <span className="text-green-700 font-semibold">
            {domainData.price} KAS
          </span>
        </p>

        {domainData.sellerTelegram && (
          <p>
            <span className="font-medium">Seller Telegram:</span>{" "}
            <Link
              href={`https://t.me/${domainData.sellerTelegram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              @{domainData.sellerTelegram}
            </Link>
          </p>
        )}

        {domainData.kaspaLink && (
          <p>
            <Link
              href={domainData.kaspaLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 hover:underline"
              aria-label={`View ${domainData.name} on Kaspa.com`}
            >
              View on Kaspa.com
            </Link>
          </p>
        )}
      </section>
    </main>
  );
}
