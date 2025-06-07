// src/app/domain/[name]/head.tsx
export const dynamic = 'force-dynamic'; // Required for access to request headers

import { headers } from "next/headers";
import { getDomainJsonLd } from "@/lib/jsonld";
import { findDomainByName } from "@/data/domainLookup";
import type { Domain } from "@/data/types";
import { categoriesData } from "@/data/categoriesManifest";

/**
 * Ensure the incoming string is lowercase and ends with ".kas"
 */
function ensureKasSuffix(name: string): string {
  const base = name.trim().toLowerCase();
  return base.endsWith(".kas") ? base : `${base}.kas`;
}

export default async function Head({
  params,
}: {
  params: { name: string };
}) {
  const headersList = await headers();
  const nonce = headersList.get("x-csp-nonce");

  // Canonicalize to lowercase + ".kas"
  const canonicalName = ensureKasSuffix(params.name);

  // Lookup expects full "foo.kas"
  const domainData: Domain | undefined = findDomainByName(canonicalName);
  if (!domainData) return null;

  // Determine category title for meta description
  const category = (() => {
    const normalized = domainData.name.trim().toLowerCase().replace(/\.kas$/, "");
    for (const cat of Object.values(categoriesData)) {
      if (cat.domains.some((d) => d.name.trim().toLowerCase().replace(/\.kas$/, "") === normalized)) {
        return cat.title;
      }
    }
    return "Unknown";
  })();

  const pageTitle = `${domainData.name} — Premium ${category} Domain | KaspaDomains.com`;
  const pageDescription = `Buy ${domainData.name}, a premium KNS domain listed in the ${category} category.`;

  // Remove leading "@" from Telegram handle (if present)
  const sellerName =
    typeof domainData.sellerTelegram === "string" && domainData.sellerTelegram.trim()
      ? domainData.sellerTelegram.replace(/^@/, "")
      : undefined;

  const jsonLd = getDomainJsonLd({
    name: domainData.name,
    price: domainData.price ?? 0,
    listed: domainData.listed ?? false,
    seller: sellerName,
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
      <meta
        property="og:image"
        content="https://kaspadomains.com/og-image.png"
      />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={domainData.name} />

      {/* Twitter Card tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta
        name="twitter:image"
        content="https://kaspadomains.com/og-image.png"
      />

      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        nonce={nonce || undefined}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
