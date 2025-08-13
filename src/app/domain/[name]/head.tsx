// src/app/domain/[name]/head.tsx

import { headers } from "next/headers";
import { getDomainJsonLd } from "@/lib/jsonld";
import type { Domain } from "@/data/types";
import { loadCategoriesManifest } from "@/data/categoriesManifest";

export const dynamic = "force-dynamic";

/**
 * Ensure the incoming string is lowercase and ends with ".kas"
 */
function ensureKasSuffix(name: string): string {
  const base = name.trim().toLowerCase();
  return base.endsWith(".kas") ? base : `${base}.kas`;
}

/**
 * Normalize domain name by trimming and removing ".kas" suffix
 */
function normalizeDomainName(name: string): string {
  return name.trim().toLowerCase().replace(/\.kas$/, "");
}

/**
 * Async function to find domain by name from the manifest
 */
async function findDomainByNameAsync(
  name: string
): Promise<Domain | undefined> {
  const manifest = await loadCategoriesManifest();

  const normalized = normalizeDomainName(name);
  for (const category of Object.values(manifest)) {
    const domain = category.domains.find(
      (d) => normalizeDomainName(d.name) === normalized
    );
    if (domain) return domain;
  }
  return undefined;
}

/**
 * Async function to find category title by domain name from manifest
 */
async function findCategoryTitleByDomainNameAsync(
  domainName: string
): Promise<string> {
  const manifest = await loadCategoriesManifest();

  const normalized = normalizeDomainName(domainName);
  for (const category of Object.values(manifest)) {
    if (
      category.domains.some(
        (d) => normalizeDomainName(d.name) === normalized
      )
    ) {
      return category.title;
    }
  }
  return "Unknown";
}

export default async function Head({
  params,
}: {
  params: { name: string };
}) {
  // Read CSP nonce from headers for script tag security
  const headersList = await headers();
  const nonce = headersList.get("x-csp-nonce");

  // Normalize domain name to canonical form
  const canonicalName = ensureKasSuffix(params.name);

  // Lookup domain data asynchronously from manifest
  const domainData = await findDomainByNameAsync(canonicalName);
  if (!domainData) return null;

  // Lookup category title asynchronously
  const category = await findCategoryTitleByDomainNameAsync(domainData.name);

  const pageTitle = `${domainData.name} — Premium ${category} Domain | KaspaDomains.com`;
  const pageDescription = `Buy ${domainData.name}, a premium KNS domain listed in the ${category} category.`;

  // Build JSON-LD structured data for SEO
  const jsonLd = getDomainJsonLd({
    name: domainData.name,
    // Use 0 as fallback since price is not in your new Domain type
    price: 0,
    // Assume all domains from registry are active listings
    listed: domainData.isActive,
    // Use first 8 chars of owner as fallback seller name
    seller: domainData.owner.slice(0, 8),
  });

  return (
    <>
      {/* Primary meta tags */}
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta name="robots" content="index,follow" />

      {/* Open Graph tags */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta
        property="og:url"
        content={`https://kaspadomains.com/domain/${domainData.name}`}
      />
      <meta property="og:image" content="https://kaspadomains.com/og-image.png" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={domainData.name} />

      {/* Twitter Card tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content="https://kaspadomains.com/og-image.png" />

      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        nonce={nonce || undefined}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
