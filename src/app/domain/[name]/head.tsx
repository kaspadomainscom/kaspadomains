// src/app/domain/[name]/head.tsx

import { headers } from "next/headers";
import { getDomainJsonLd } from "@/lib/jsonld";
import { findDomainByName } from "@/data/domainLookup";
import type { Domain } from "@/data/types";

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

  // Remove leading "@" if present
  const sellerName =
    typeof domainData.sellerTelegram === "string" &&
    domainData.sellerTelegram.trim()
      ? domainData.sellerTelegram.replace(/^@/, "")
      : undefined;

  const jsonLd = getDomainJsonLd({
    name: domainData.name,
    price: domainData.price ?? 0,
    listed: domainData.listed ?? false,
    seller: sellerName,
  });

  return (
    <script
      type="application/ld+json"
      nonce={nonce || undefined}
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
